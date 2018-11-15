/// <reference path="./types/ipfs.d.ts" />
/// <reference path="./types/ipfs-repo.d.ts" />

import * as Ipfs from 'ipfs'
import {Message, PeerID} from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'
import {pack, Packable, unpack} from './packer'
import {Introduction, ReadyUpInfo} from './messages'
import {nextFloat, nextInt, seedInt} from './rng'
import {version} from '../package.json'
import Errors from './errors'
import Events, { EventMap } from './events'

type Constructor<Instance> = { new(...args: any[]): Instance }
type RoomID = string | PeerID

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

export interface P2Popts {
    allowSameBrowser: boolean
    repo: string
    Swarm: string[]
    pollInterval: number
    maxIdleTime: number
}

export default class P2P<T extends Packable>
    extends (EventEmitter as Constructor<StrictEventEmitter<EventEmitter, EventMap>>) {

    private readonly ipfs: Ipfs

    /** id's of all we have ever met */
    private readonly allPeers: Map<PeerID, T> = new Map

    /** id's of all in lobby */
    private readonly lobby: Set<PeerID> = new Set

    /** id's of all peers and their group leader's id. */
    private readonly allGroups: Map<PeerID, PeerID> = new Map

    /** ID of group leader */
    private leader: PeerID = ''

    /** my ID */
    private id: PeerID = ''

    /** Temporary holding of the peers in room. Room is ready once this matches `this.group` */
    private peersInRoom?: Set<PeerID>

    private status: ConnectionStatus = ConnectionStatus.OFFLINE
    private joiningRoom = false

    private readonly pollInterval: number
    private readonly LOBBY_ID: RoomID

    public inLobby = false

    /** Time to wait for an introduction from a peer we don't know who just connected */
    private static readonly MISSING_WAIT = 5 * 1000

    constructor(
        public readonly name: T,
        pkg: string,
        {
            allowSameBrowser = false,
            repo = `/tmp/p2p-lobby/${version}/${pkg +
                allowSameBrowser ? '/' + Math.random().toString().substr(2) : ''}`,
            Swarm = ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
            pollInterval = 5 * 1000,
            maxIdleTime = 0,
        }: Partial<P2Popts> = {},
    ) {
        super()

        this.ipfs = new Ipfs({
            repo,
            start: false,
            config: { Addresses: { Swarm } },
            EXPERIMENTAL: { pubsub: true },
        })

        this.LOBBY_ID = `${pkg}_lobby_${version}` // something a peerId could never be
        this.pollInterval = pollInterval

        this.ipfs.on('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', this.error)
        addEventListener('beforeunload', async e => {
            e.preventDefault()
            await this.disconnect()

            // Chrome requires returnValue to null so no prompt appears.
            return e.returnValue = undefined
        })

        // Disconnect peers idling in lobby
        if (maxIdleTime) {
            let handle: NodeJS.Timeout | void
            const stopIdleCountdown = () => {
                if(handle) {
                    clearTimeout(handle)
                    handle = undefined
                }
            }

            this.on(Events.lobbyConnect, () => {
                handle = setTimeout(
                    () => !this.inGroup && this.disconnect(),
                    maxIdleTime
                ) as unknown as NodeJS.Timeout
            })
            this.on(Events.disconnected, stopIdleCountdown)
            this.on(Events.groupReadyInit, stopIdleCountdown)
        }
    }

    get isConnected() { return this.status == ConnectionStatus.ONLINE || this.status == ConnectionStatus.DISCONNECTING }

    get isLeader()    { return this.isConnected && this.id == this.leader }

    get inRoom()      { return this.isConnected && !this.inLobby && this.inGroup && !!this.leader }

    get inGroup()     { return !!this.myGroup.size }

    get groupPeers()  { return this.peersInSet(this.myGroup) }

    get lobbyPeers()  { return this.peersInSet(this.lobby) }

    get isReady()     { return this.peersInRoom == undefined && this.inRoom }

    /** id's of group members */
    private get myGroup(): ReadonlySet<PeerID> {
        const group = new Set
        if (this.leader) // Only do this if already in a group
            for (const [peer, leader] of this.allGroups)
                if (leader == this.leader)
                    group.add(peer)
        return group
    }

    /** The ID of the IPFS room we are currently connected to */
    private get roomID(): RoomID | void {
        return !this.isConnected
                ? undefined
                : this.inLobby 
                    ? this.LOBBY_ID
                    : this.inRoom 
                        ? this.leader
                        : undefined
    }

    async connect() {
        // go online if not already
        if(this.status == ConnectionStatus.OFFLINE)
            await new Promise((resolve, reject) => {
                this.ipfs.once('ready', resolve)
                this.ipfs.once('error', reject)
            }).catch(this.error)

        // Grab an id and start node if haven't aleard
        if(this.status == ConnectionStatus.READY)
            try {
                this.status = ConnectionStatus.CONNECTING
                await this.ipfs.start()
                this.id = (await this.ipfs.id()).id
                this.status = ConnectionStatus.ONLINE
                this.emit(Events.connected)
            } catch(e) { this.error(e) }
    }

    async disconnect() {
        if (this.isConnected) {
            this.status = ConnectionStatus.DISCONNECTING
            // Leave rooms manually since ipfs.stop doesn't disconnect us.
            await this.leaveRoom()
            this.allPeers.clear()
            this.allGroups.clear()
            this.lobby.clear()
            this.leader = ''
            try {
                await this.ipfs.stop()
                this.status = ConnectionStatus.READY
            } catch(e) {
                this.error(e)
            } finally {
                this.emit(Events.disconnected)
                this.removeAllListeners()
            }
        }
    }

    async joinLobby() {
        if (this.joiningRoom)
            this.error(Errors.SYNC_JOIN)
        this.joiningRoom = true

        await this.leaveRoom()
        await this.connect()

        try {
            await (() => this.ipfs.pubsub.subscribe(this.LOBBY_ID, this.onLobbyMessage, {discover: true}).catch(this.error))()
            this.inLobby = true
            this.emit(Events.lobbyConnect)
            this.pollLobby()
        } catch(e) {
            this.error(e)
        } finally {
            this.joiningRoom = false
        }
    }

    /** Joins a new group. */
    async joinGroup(peer: PeerID) {
        if (peer == this.leader || peer == this.id)
            return

        if (!this.inLobby)
            this.error(Errors.MUST_BE_IN_LOBBY)

        if (this.lobby.has(peer) && this.allGroups.get(peer) != '' && this.allGroups.get(peer) != peer)
            this.error(Errors.LEADER_IN_GROUP)

        this.allGroups.set(peer, peer)
        this.leader = peer

        this.emit(Events.groupStart)
        for (const peer of this.myGroup) {
            this.emit(Events.groupJoin, peer)
            this.emit(Events.groupChange, {peer, joined: true})
        }
        return this.broadcast(new Introduction(this.name, this.leader, false))
    }

    /**
     * Shortcut to leave all groups.
     * Doesn't need to be called to change groups.
     */
    public leaveGroup = async () => this.joinGroup('') 

    async broadcast(data: any) {
        if (this.roomID)
            return this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer).catch(this.error)
        this.error(Errors.MUST_BE_IN_ROOM, {data, roomID: this.roomID})
    }

    async readyUp() {
        if (!this.inLobby)
            this.error(Errors.MUST_BE_IN_LOBBY)
        
        if (!this.isLeader)
            this.error(Errors.LEADER_READY_UP)

        try {
            await this.broadcast(new ReadyUpInfo(this.hashGroupPeers()))
            await this.gotoRoom()
        }
        catch(e) { this.error(e) }
        finally  { this.joiningRoom = false }
    }

    /**
     * Generates a random number in [0,1). Same as Math.random()
     * If `isInt` is true, than a integer in range [-2 ** 31, 2 ** 31) is generated.
     */
    random(isInt = false) {
        if (!this.inRoom)
            this.error(Errors.ROOM_NOT_READY)

        return isInt ? nextInt() : nextFloat()
    }

    getPeerName = (peer: PeerID) => this.allPeers.get(peer)
    
    /**
     * Helper to ensure errors are thrown properly.
     * TODO: Broadcast messages if in room
     */
    private error = (error: Errors | Error, extra: object = {}): never => {
        if (!(error instanceof Error))
            error = Error(error)
        for(const [prop, value] of Object.entries(extra))
            (error as any)[prop] = value
        this.emit(Events.error, error)
        throw error
    }

    private async leaveRoom() {
        if (this.inLobby)
            try      { await this.ipfs.pubsub.unsubscribe(this.LOBBY_ID, this.onLobbyMessage) }
            catch(e) { this.error(e) }
            finally  { this.inLobby = false }

        else if (this.inRoom)
            try      { await this.ipfs.pubsub.unsubscribe(this.roomID as RoomID, this.onRoomMessage) }
            catch(e) { this.error(e) }
            finally  {
                this.leader = ''
                delete this.peersInRoom
            }
    }

    /** Moves to private room for just the group */
    private async gotoRoom() {
        if (this.joiningRoom)
            this.error(Errors.SYNC_JOIN)
        this.joiningRoom = true

        seedInt(this.hashGroupPeers())
        this.emit(Events.groupReadyInit)

        try {
            await this.leaveRoom()
            // this.leader must be kept to know the room ID when leaving
            await this.ipfs.pubsub.subscribe(this.leader, this.onRoomMessage, {discover: true})

            this.emit(Events.groupConnect)
            this.peersInRoom = new Set
            this.pollRoom()
        }
        catch(e) { this.error(e) }
        finally {
            this.inLobby = false
            this.joiningRoom = false
        }
    }

    private onRoomMessage = ({from, data}: Message) =>
        // TODO: Check if room is ready before emitting
        this.emit(Events.data, {
            data: unpack(data),
            peer: from.toString(),
        })

    private onLobbyMessage = ({from, data}: Message) => {
        const peer = from.toString()

        // we don't care about our own messages in the lobby
        if (peer == this.id) return

        const msg = unpack(data)

        if (msg instanceof Introduction) {
            // Introduce ourselves if peer we already know who wants to meet us.
            // (Otherwise the poller will handle it)
            if (this.allPeers.has(peer) && msg.infoRequest)
                this.broadcast(new Introduction(this.name, this.leader))

            // A peer we don't know introduced themselves
            if (!this.allPeers.has(peer)) {
                this.allPeers.set(peer, msg.name)
                this.lobby.add(peer)
                this.emit(Events.lobbyJoin, peer)
                this.emit(Events.lobbyChange, {peer, joined: true})
            }

            // Joining a group about me
            if (!this.myGroup.has(peer) && (
                   ( this.leader  && msg.leader == this.leader) // peer is joining the group im in
                || (!this.inGroup && msg.leader == this.id)     // peer is making me the leader of a new group
            )) {
                if (!this.inGroup)  { // I am a group leader now
                    this.leader = this.id
                    this.emit(Events.groupStart)
                }
                this.allGroups.set(peer, this.leader) // they are in our group now
                this.emit(Events.groupJoin, peer)
                this.emit(Events.groupChange, {peer, joined: true})
            } // else

            // Change group that peer belongs to
            this.allGroups.set(peer, msg.leader)

            // Leaving a group with me
            if (this.myGroup.has(peer) && msg.leader != this.leader) {
                this.allGroups.set(peer, '')
                if (!this.inGroup) // Everyone left my room :(
                    this.leader = ''
                this.emit(Events.groupLeft, peer)
                this.emit(Events.groupChange, {peer, joined: false})
            }
        } else if (msg instanceof ReadyUpInfo) {
            // TODO: Wait for peers before failing
            if (this.hashGroupPeers() != msg.hash)
                this.error(Errors.LIST_MISMATCH)
            this.gotoRoom()
        } else
            this.error(Errors.UNEXPECTED_MESSAGE, {peer, data: msg})
    }

    /**
     * Runs a check against ipfs.pubsub.peers to find who has left and entered the lobby.
     * After completion will run again in `this.pollInterval`ms.
     * 
     * Doesn't track peers who left and came back.
     */
    private pollLobby = async () => {
        if (!this.inLobby)
            return

        try {
            const updatedPeerList = await this.ipfs.pubsub.peers(this.roomID as RoomID).catch(this.error)

            const missingPeers = new Set
            const peersJoined = updatedPeerList.filter(peer => !this.lobby.has(peer))
            const peersLeft = [...this.lobby].filter(peer => !updatedPeerList.includes(peer))

            for (const peer of peersJoined) {
                if (peer == this.id) continue // don't track self

                // An unknown peer joined the lobby
                if (!this.allPeers.has(peer)) 
                    missingPeers.add(peer)

                // we know them, but didn't know they were in the lobby
                else if (!this.lobby.has(peer)) {
                    this.lobby.add(peer)
                    this.emit(Events.lobbyJoin, peer)
                    this.emit(Events.lobbyChange, {peer, joined: true})
                }
            }

            for (const peer of peersLeft) {
                if (peer == this.id) continue // don't track self

                // Peer is leaving the lobby
                if (this.lobby.has(peer)) {
                    this.lobby.delete(peer)
                    this.emit(Events.lobbyLeft, peer)
                    this.emit(Events.lobbyChange, {peer, joined: false})
                }

                // someone from group disconnected
                if (this.myGroup.has(peer)) {
                    this.allGroups.set(peer, '')
                    if (!this.inGroup) // Everyone left my room :(
                        this.leader = ''
                    this.emit(Events.groupLeft, peer)
                    this.emit(Events.groupChange, {peer, joined: false})
                    if (!this.inGroup) // wait for the other events
                        this.emit(Events.groupDone)
                }

                // The leader of our group left, so we should leave too.
                if (peer == this.leader)
                    await this.leaveGroup()
            }
            
            // Introduce myself if someone we don't know joined
            if (missingPeers.size) {
                const noLongerMissing = (peer: PeerID) => missingPeers.delete(peer)
                this.on(Events.lobbyJoin, noLongerMissing) // we know the missing peer now!

                // Wait for some time for since the peer may have introduced themselves and we don't need more info back
                await new Promise(resolve => {
                    setTimeout(async () => {
                        this.removeListener(Events.lobbyJoin, noLongerMissing)
                        if (this.roomID) // check incase we have left the lobby. (easier than cancelling this timeout)
                            await this.broadcast(new Introduction(this.name, this.leader, missingPeers.size > 0))
                        resolve()
                    }, P2P.MISSING_WAIT)
                })
            }

            setTimeout(this.pollLobby, this.pollInterval) // quit polling on error
        } catch(originalError) { 
            this.error(Errors.POLLING_LOBBY, {originalError})
        }
    }

    private pollRoom = async () => {
        if (!this.inRoom)
            return

        try {
            const updatedPeerList = await this.ipfs.pubsub.peers(this.roomID as RoomID).catch(this.error)

            // Still waiting for all the group members to join
            if (this.peersInRoom) {
                const peersJoined = updatedPeerList.filter(peer => !this.peersInRoom!.has(peer))

                for (const peer of peersJoined) {
                    if (peer == this.id) continue // don't track self

                    if (this.myGroup.has(peer))
                        this.peersInRoom.add(peer)
                    else
                        this.error(Errors.UNEXPECTED_PEER, {peer})
                }

                // All the peers who could make it are finally here.
                if (this.myGroup.size == this.peersInRoom.size) {
                    delete this.peersInRoom
                    this.emit(Events.groupReady)
                }
            }

            // We don't want to track peers who haven't joined yet as peers who left.
            const trackAgainst = this.peersInRoom ? this.peersInRoom : this.myGroup

            const peersLeft = [...trackAgainst].filter(peer => !updatedPeerList.includes(peer))
            for (const peer of peersLeft) {
                if (peer == this.id) continue // don't track self

                if (trackAgainst.has(peer)) {
                    this.allGroups.set(peer, '')
                    this.emit(Events.groupLeft, peer)
                    this.emit(Events.groupChange, {peer, joined: false})
                    if (!this.inGroup) {
                        this.leader = ''
                        this.emit(Events.groupDone)
                    }
                } // else, ignore a random peer leaving
            }

            if (this.inGroup) // keep polling if there are still peers in group
                setTimeout(this.pollRoom, this.pollInterval)
            else // no point in staying in an empty room
                this.leaveRoom()
        } catch(originalError) { 
            this.error(Errors.POLLING_ROOM, {originalError, roomID: this.roomID})
        }
    }

    /**
     * Generates a number based on the peers connected to the current room.
     * Meaning this value should be consistent with all other peers as well.
     */
    private hashGroupPeers() {
        // Alphabet of Base58 characters used in peer id's
        const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

        let allIdHash = 1
        let idHash
        for (const id of [...this.myGroup, this.id].sort()) {
            idHash = 0
            for(let i = 0; i < id.length; i++)
                idHash += (ALPHABET.indexOf(id[i]) + 1) * (ALPHABET.length * i + 1)
            allIdHash *= idHash
            allIdHash %= 0xFFFFFFFF
        }
        return allIdHash - 0x7FFFFFFF
    }

    private peersInSet(set: ReadonlySet<PeerID>): Map<PeerID, T> {
        const peers = new Map
        for(const peerId of set)
            peers.set(peerId, this.allPeers.get(peerId)) // should never be null
        return peers
    }
}
