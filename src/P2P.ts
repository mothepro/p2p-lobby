/// <reference path="./types/ipfs.d.ts" />
/// <reference path="./types/ipfs-repo.d.ts" />

import * as Ipfs from 'ipfs'
import {Message, PeerID} from 'ipfs'
import Emitter from 'fancy-emitter'
import {Buffer} from 'buffer'
import {pack, Packable, unpack} from './packer'
import {Introduction, ReadyUpInfo} from './messages'
import {nextFloat, nextInt, seedInt} from './rng'
import {version} from '../package.json'
import Errors from './errors'

type RoomID = string | PeerID

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

// TODO Switch to namespace
export default class P2P<NameType extends Packable = string, ReadyUpType extends Packable = any> {

    /** Time to wait for an introduction from a peer we don't know who just connected */
    private static readonly MISSING_WAIT = 5 * 1000

    /** How often to check for peers when waiting for them in the room's group */
    static readonly ROOM_WAITING_POLL_INTERVAL = 2 * 1000

    /** How often to check for peers once we know everyone is in the room's group */
    static readonly ROOM_READY_POLL_INTERVAL = 15 * 1000

    /** IPFS node */
    private readonly ipfs: Ipfs

    /** id's of all we have ever met */
    private readonly allPeers: Map<PeerID, NameType> = new Map

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

    private readonly LOBBY_ID: RoomID

    /** Some error sas throw... */
    // TODO Replace with deactivations.
    readonly error = new Emitter<Error>()
        
    /** Recieved some data */
    readonly data = new Emitter<{ peer: PeerID, data: any }>()

    /** Connected to the P2P network */
    readonly connected = new Emitter
    /** Disconnected from the P2P network */
    readonly disconnected = new Emitter

    /** Connected to the lobby */
    readonly lobbyConnect = new Emitter
    /** A peer has joined the lobby */
    readonly lobbyJoin = new Emitter<PeerID>()
    /** A peer has left the lobby */
    readonly lobbyLeft = new Emitter<PeerID>()
    /** A peer has joined or left the lobby */
    readonly lobbyChange = new Emitter<{ peer: PeerID, joined: boolean }>()

    /** A new group is made */
    readonly groupStart = new Emitter
    /** A group is closed */
    readonly groupDone = new Emitter
    /** A peer has joined my group */
    readonly groupJoin = new Emitter<PeerID>()
    /** A peer has left my group */
    readonly groupLeft = new Emitter<PeerID>()
    /** A peer has joined or left my group */
    readonly groupChange = new Emitter<{ peer: PeerID, joined: boolean }>()
    /** The group and all members are ready in shared room */
    readonly groupReady = new Emitter

    /** The group leader has requested to move group members to a private room */
    readonly groupReadyInit = new Emitter<ReadyUpType>()
    /** Connected to private room which will soon have all group members */
    readonly groupConnect = new Emitter

    inLobby = false

    constructor(
        public readonly name: NameType,
        pkg: string,
        {
            allowSameBrowser = false,
            repo = `/tmp/p2p-lobby/${version}/${pkg +
                allowSameBrowser ? '/' + Math.random().toString().substr(2) : ''}`,
            Swarm = ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
        }: {
            allowSameBrowser?: boolean
            repo?: string
            Swarm?: string[]
        } = {},
    ) {
        this.LOBBY_ID = `${pkg}_lobby_${version}` // something a peerId could never be

        this.ipfs = new Ipfs({
            repo,
            start: false,
            config: { Addresses: { Swarm } },
            EXPERIMENTAL: { pubsub: true },
        })
        this.ipfs.on('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', error => this.makeError(error))

        this.lobbyJoin.onContinueAfterError(peer => this.lobbyChange.activate({ peer, joined: true }))
        this.lobbyLeft.onContinueAfterError(peer => this.lobbyChange.activate({ peer, joined: false }))
        this.groupJoin.onContinueAfterError(peer => this.groupChange.activate({ peer, joined: true }))
        this.groupLeft.onContinueAfterError(peer => this.groupChange.activate({ peer, joined: false }))

        addEventListener('beforeunload', e => {
            e.preventDefault()
            this.disconnect()

            // Chrome requires returnValue to null so no prompt appears.
            return e.returnValue = undefined
        })
    }

    get isConnected() { return this.status == ConnectionStatus.ONLINE /* || this.status == ConnectionStatus.DISCONNECTING */ }

    get isLeader() { return this.isConnected && this.id == this.leader }

    get inRoom() { return this.isConnected && !this.inLobby && this.inGroup && !!this.leader }

    get inGroup() { return !!this.myGroup.size }

    get groupPeers() { return this.peersInSet(this.myGroup) }

    get lobbyPeers() { return this.peersInSet(this.lobby) }

    get isReady() { return this.peersInRoom == undefined && this.inRoom }

    public getPeerName = (peer: PeerID) => this.allPeers.get(peer)

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
    private get roomID(): RoomID | undefined {
        return this.inLobby
            ? this.LOBBY_ID
            : this.inRoom
                ? this.leader
                : undefined
    }

    async connect() {
        try {
            // go online if not already
            if (this.status == ConnectionStatus.OFFLINE)
                await new Promise((resolve, reject) => {
                    this.ipfs.once('ready', resolve)
                    this.ipfs.once('error', reject)
                })

            // Grab an id and start node if haven't already
            if (this.status == ConnectionStatus.READY) {
                this.status = ConnectionStatus.CONNECTING
                await this.ipfs.start()
                this.id = (await this.ipfs.id()).id
                this.status = ConnectionStatus.ONLINE
                this.connected.activate()
            }
        } catch (e) {
            return this.makeError(e)
        }
        return this.connected.previous
    }

    async disconnect() {
        if (this.isConnected) {
            this.status = ConnectionStatus.DISCONNECTING
            // Leave rooms manually since ipfs.stop doesn't disconnect us.
            await this.leave()
            this.allPeers.clear()
            this.allGroups.clear()
            this.lobby.clear()
            this.leader = ''
            try {
                await this.ipfs.stop()
                this.status = ConnectionStatus.READY
                this.disconnected.activate()
            } catch (e) {
                return this.makeError(e, this.disconnected)
            }
        }
        return this.disconnected.previous
    }

    async joinLobby({
        pollInterval = 2 * 1000, // How often to check for new peers
        maxIdle = 0, // Max time to wait before being kicked
    } = {}) {
        if (this.joiningRoom)
            return this.makeError(Errors.SYNC_JOIN)
        this.joiningRoom = true

        await this.leave()
        await this.connect()

        try {
            await this.ipfs.pubsub.subscribe(this.LOBBY_ID, this.onLobbyMessage, { discover: true })
            this.inLobby = true
            this.lobbyConnect.activate()
            this.pollLobby(pollInterval)

            // Disconnect peers idling in lobby
            if (maxIdle) {
                const handle = setTimeout(() => !this.inGroup && this.disconnect(), maxIdle)
                const stopIdleCountdown = () => clearTimeout(handle)
                this.disconnected.once(stopIdleCountdown)
                this.groupReadyInit.once(stopIdleCountdown as any) // not sure why this doesn't work??
            }
        } catch (e) {
            return this.makeError(e)
        }
        this.joiningRoom = false
        return this.lobbyConnect.previous
    }

    /** Joins a new group. */
    // TODO: Return if successful and allow confirmation
    async joinGroup(peer: PeerID) {
        if (peer == this.leader || peer == this.id)
            return

        if (!this.inLobby)
            return this.makeError(Errors.MUST_BE_IN_LOBBY)

        if (this.lobby.has(peer) && this.allGroups.get(peer) != '' && this.allGroups.get(peer) != peer)
            return this.makeError(Errors.LEADER_IN_GROUP)

        if (peer) // since they may be leaving a group (peer == '')
            this.allGroups.set(peer, peer)
        this.leader = peer

        this.groupStart.activate()
        for (const peer of this.myGroup)
            this.groupJoin.activate(peer)
        return this.broadcast(new Introduction(this.name, this.leader, false))
    }

    async broadcast(data: any) {
        try {
            if (this.roomID)
                return this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer)
        } catch (e) {
            return this.makeError(e, { data, roomID: this.roomID })
        }
    }

    async readyUp(info?: ReadyUpType) {
        if (!this.inLobby)
            return this.makeError(Errors.MUST_BE_IN_LOBBY)

        if (!this.isLeader)
            return this.makeError(Errors.LEADER_READY_UP)

        try {
            await this.broadcast(new ReadyUpInfo(this.hashGroupPeers(), info))
            await this.gotoRoom(info) // TODO just listen on broadcast to be dryer
        }
        catch (e) { return this.makeError(e) }
        finally { this.joiningRoom = false }
    }

    /**
     * Generates a random number in [0,1). Same as Math.random()
     * If `isInt` is true, than a integer in range [-2 ** 31, 2 ** 31) is generated.
     */
    random(isInt = false) {
        if (!this.inRoom)
            return this.makeError(Errors.ROOM_NOT_READY, { reason: 'Generating random number' })

        return isInt ? nextInt() : nextFloat()
    }

    /** Leaves the lobby and the room we are connected to, if any. */
    public async leave() {
        if (this.inLobby)
            try { await this.ipfs.pubsub.unsubscribe(this.LOBBY_ID, this.onLobbyMessage) }
            catch (e) { return this.makeError(e) }
            finally { this.inLobby = false }

        else if (this.inRoom)
            try { await this.ipfs.pubsub.unsubscribe(this.roomID as RoomID, this.onRoomMessage) }
            catch (e) { return this.makeError(e) }
            finally {
                this.leader = ''
                delete this.peersInRoom
            }
    }

    /** Moves to private room for just the group */
    private async gotoRoom(info?: ReadyUpType) {
        if (this.joiningRoom)
            return this.makeError(Errors.SYNC_JOIN)
        this.joiningRoom = true

        seedInt(this.hashGroupPeers())
        // @ts-ignore TODO: resolve this is issue
        // Argument of type 'ReadyUpType' is not assignable to parameter of type 'Parameters<OneArgFn<ReadyUpType>>'.ts
        this.groupReadyInit.activate(info)

        try {
            await this.leave()
            // this.leader must be kept to know the room ID when leaving
            await this.ipfs.pubsub.subscribe(this.leader, this.onRoomMessage, { discover: true })

            this.groupConnect.activate()
            this.peersInRoom = new Set
            this.pollRoom()
        }
        catch (e) { return this.makeError(e) }
        finally {
            this.inLobby = false
            this.joiningRoom = false
        }
    }

    private onRoomMessage = ({ from, data }: Message) =>
        // TODO: Check if room is ready before emitting
        this.data.activate({
            data: unpack(data),
            peer: from.toString(),
        })

    private onLobbyMessage = ({ from, data }: Message) => {
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
                this.lobbyJoin.activate(peer)
            }

            // Joining a group with me
            if (!this.myGroup.has(peer) && (
                (this.leader && msg.leader == this.leader)  // peer is joining the group im in
                || (!this.inGroup && msg.leader == this.id) // peer is making me the leader of a new group
            )) {
                if (!this.inGroup) { // I am a group leader now
                    this.leader = this.id
                    this.groupStart.activate()
                }
                this.allGroups.set(peer, this.leader) // they are in our group now
                this.groupJoin.activate(peer)
            } // else

            // Change group that peer belongs to
            this.allGroups.set(peer, msg.leader)

            // Leaving a group with me
            if (this.myGroup.has(peer) && msg.leader != this.leader) {
                this.allGroups.set(peer, '')
                if (!this.inGroup) // Everyone left my room :(
                    this.leader = ''
                this.groupLeft.activate(peer)
            }
        } else if (msg instanceof ReadyUpInfo) {
            if (peer == this.leader) {
                const h = this.hashGroupPeers()
                // TODO: Wait for peers before failing
                if (h != msg.hash)
                    return this.makeError(Errors.LIST_MISMATCH)
                this.gotoRoom(msg.info)
            } else
                // clean lobby of groups we know are leaving
                for (const [other, leader] of this.allGroups)
                    if (leader == peer) {
                        this.lobby.delete(other)
                        this.lobbyLeft.activate(other)
                    }
        } else
            return this.makeError(Errors.UNEXPECTED_MESSAGE, { peer, data: msg })
    }

    /**
     * Runs a check against ipfs.pubsub.peers to find who has left and entered the lobby.
     * After completion will run again in `this.pollInterval`ms.
     *
     * Doesn't track peers who left and came back.
     */
    private pollLobby = async (pollInterval: number) => {
        if (!this.isConnected || !this.inLobby)
            return

        try {
            const updatedPeerList = await this.ipfs.pubsub.peers(this.roomID as RoomID)

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
                    this.lobbyJoin.activate(peer)
                }
            }

            for (const peer of peersLeft) {
                if (peer == this.id) continue // don't track self

                // Peer is leaving the lobby
                if (this.lobby.has(peer)) {
                    this.lobby.delete(peer)
                    this.lobbyLeft.activate(peer)
                }

                // someone from group disconnected
                if (this.myGroup.has(peer)) {
                    this.allGroups.set(peer, '')
                    if (!this.inGroup) // Everyone left my room :(
                        this.leader = ''
                    this.groupLeft.activate(peer)
                    if (!this.inGroup) // wait for the other events
                        this.groupDone.activate()
                }

                // The leader of our group left, so we should leave too.
                if (peer == this.leader)
                    await this.joinGroup('')
            }

            // Introduce myself if someone we don't know joined
            if (missingPeers.size)
                // Wait for some time for since the peer may have introduced themselves and we don't need more info back
                await new Promise(resolve => {
                    // A peer is no longer missing once we find them
                    const cancel = this.lobbyJoin.onCancellable(peer => missingPeers.delete(peer))
                    
                    setTimeout(async () => {
                        cancel()
                        if (this.roomID) // check incase we have left the lobby. (easier than cancelling this timeout)
                            await this.broadcast(
                                new Introduction(this.name, this.leader, missingPeers.size > 0))
                        resolve()
                    }, P2P.MISSING_WAIT)
                })

            setTimeout(this.pollLobby, pollInterval, pollInterval) // quit polling on error
        } catch (cause) {
            return this.makeError(Errors.POLLING_LOBBY, { cause })
        }
    }

    private pollRoom = async () => {
        // no point in staying in an empty room
        if (!this.inRoom)
            return this.leave()

        try {
            const updatedPeerList = await this.ipfs.pubsub.peers(this.roomID as RoomID)

            // Still waiting for all the group members to join
            if (this.peersInRoom) {
                const peersJoined = updatedPeerList.filter(peer => !this.peersInRoom!.has(peer))

                for (const peer of peersJoined) {
                    if (peer == this.id) continue // don't track self

                    if (this.myGroup.has(peer))
                        this.peersInRoom.add(peer)
                    else
                        return this.makeError(Errors.UNEXPECTED_PEER, { peer })
                }

                // All the peers who could make it are finally here.
                if (this.myGroup.size == this.peersInRoom.size) {
                    delete this.peersInRoom
                    this.groupReady.activate()
                }
            }

            // We don't want to track peers who haven't joined yet as peers who left.
            const trackAgainst = this.peersInRoom ? this.peersInRoom : this.myGroup

            const peersLeft = [...trackAgainst].filter(peer => !updatedPeerList.includes(peer))
            for (const peer of peersLeft) {
                if (peer == this.id) continue // don't track self

                if (trackAgainst.has(peer)) {
                    this.allGroups.set(peer, '')
                    this.groupLeft.activate(peer)
                    if (!this.inGroup) {
                        this.leader = ''
                        this.groupDone.activate()
                    }
                } // else, ignore a random peer leaving
            }

            if (this.inGroup) // keep polling if there are still peers in group
                setTimeout(this.pollRoom, this.peersInRoom
                    ? P2P.ROOM_WAITING_POLL_INTERVAL
                    : P2P.ROOM_READY_POLL_INTERVAL)
        } catch (cause) {
            // TODO should this be groupReady
            return this.makeError(Errors.POLLING_ROOM, { cause, roomID: this.roomID })
        }
    }

    /**
     * Generates a number based on the peers connected to the current room.
     * Meaning this value should be consistent with all other peers as well.
     */
    private hashGroupPeers() {
        // Alphabet of Base58 characters used in peer id's
        const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
        const peerIDs = [...this.myGroup, this.id].sort()

        let allIdHash = 1
        let idHash
        for (const id of peerIDs) {
            idHash = 0
            for (let i = 0; i < id.length; i++)
                idHash += (ALPHABET.indexOf(id[i]) + 1) * (ALPHABET.length * i + 1)
            allIdHash *= idHash
            allIdHash %= 0xFFFFFFFF
        }
        return allIdHash - 0x7FFFFFFF
    }

    private peersInSet(set: ReadonlySet<PeerID>): Map<PeerID, NameType> {
        const peers = new Map
        for (const peerId of set)
            peers.set(peerId, this.allPeers.get(peerId)) // should never be null
        return peers
    }

    /**
     * Helper to ensure errors are built properly.
     *
     * If an emitter isn't given, the error is just thrown.
     * If an emitter is given, it will be deactivated. The async function which caused
     * the error should return the `.previous` Promise on the emitter as the value.
     * This avoids UnhandledPromiseRejection errors.
     * /
    // TODO: Broadcast messages if in room
    // private static error(error: Errors | Error, emitter: Emitter<any>, extra?: object): typeof emitter
    // private static error(error: Errors | Error, extra?: object): Error
    private static error(error: Errors | Error, emitter?: Emitter<any>, extra: object = {}) {
        if (!(error instanceof Error))
            error = Error(error)
        if (extra)
            for(const [prop, value] of Object.entries(extra))
                (error as any)[prop] = value
        this.errorEmitter.activate(error)
        // if (emitter)
        //     return emitter.deactivate(error)
        // throw error
    }

    /** Temp */
    private makeError(error: Errors | Error, extra?: { [prop: string]: any }): Error {
        if (!(error instanceof Error))
            error = Error(error)
        if (extra)
            for (const [prop, value] of Object.entries(extra))
                (error as any)[prop] = value
        this.error.activate(error)
        return error
    }
}
