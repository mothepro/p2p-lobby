import * as Ipfs from 'ipfs'
import {Message, PeerID} from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'
import {pack, Packable, unpack} from './packer'
import {Introduction, ReadyUpInfo} from './messages'
import {nextFloat, nextInt, seedInt} from './rng'
import {version} from '../package.json'

type Constructor<Instance> = { new(...args: any[]): Instance }
type RoomID = PeerID // Alias for the names of rooms

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

export const enum Errors {
    SYNC_JOIN           = 'Can not join another room until previous connection is complete',
    BAD_PEERID          = 'The given peer id is invalid',
    MUST_BE_IN_ROOM     = 'Must be in a room to do this',
    NOT_CONNECTED       = 'Wait for `connect` method to resolve',
    READY_UP            = 'Must be in lobby to ready up',
    NO_PEERS_IN_ROOM    = 'No other peers have entred this room',
    ROOM_NOT_READY      = 'Can not perform this action until the room is ready',
    LIST_MISMATCH       = 'Our list or peers is inconsistent with the peer we joined',
    UNEXPECTED_MESSAGE  = 'An unexpected message was recieved',
    POLLING             = 'An error was encountered while polling (Usually safe to ignore)',
}

export const enum EventNames {
    error,
    data,
    roomReady,
    connected,
    disconnected,

    // Peer connections
    peerJoin,
    peerLeft,
    peerChange,

    // Lobby specific peer connections
    lobbyJoin,
    lobbyLeft,
    lobbyChange,

    // My room specific peer connections
    meJoin,
    meLeft,
    meChange,
}

export interface Events {
    [EventNames.error]: Error
    [EventNames.data]: {peer: PeerID, data: any}
    [EventNames.roomReady]: void
    [EventNames.connected]: void
    [EventNames.disconnected]: void

    [EventNames.peerJoin]: PeerID
    [EventNames.peerLeft]: PeerID
    [EventNames.peerChange]: {peer: PeerID, joined: boolean}

    [EventNames.lobbyJoin]: PeerID
    [EventNames.lobbyLeft]: PeerID
    [EventNames.lobbyChange]: {peer: PeerID, joined: boolean}

    [EventNames.meJoin]: PeerID
    [EventNames.meLeft]: PeerID
    [EventNames.meChange]: {peer: PeerID, joined: boolean}
}

export interface P2Popts {
    allowSameBrowser: boolean
    repo: string
    Swarm: string[]
    pollInterval: number
    maxIdleTime: number
}

export default class P2P<T extends Packable>
    extends (EventEmitter as Constructor<StrictEventEmitter<EventEmitter, Events>>) {

    public readonly ipfs: Ipfs

    private readonly allPeers: Map<PeerID, T> = new Map
    private readonly allRooms: Map<RoomID, Set<PeerID>> = new Map
    private readyPeers?: Map<PeerID, T>

    private status: ConnectionStatus = ConnectionStatus.OFFLINE
    private roomID: string = ''
    private id: PeerID = ''

    private readonly pollInterval: number
    private readonly LOBBY_ID: RoomID

    private readonly maxIdleTime: number
    private maxIdleTimeHandle?: number

    private joiningRoom = false

    constructor(
        public readonly name: T,
        pkg: string,
        {
            allowSameBrowser = false,
            repo = `/tmp/p2p-lobby/${version}/${pkg}${
                allowSameBrowser ? '/' + Math.random().toString().substr(2) : ''}`,
            Swarm = ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
            pollInterval = 5 * 1000,
            maxIdleTime = 0,
        }: Partial<P2Popts> = {},
    ) {
        super()

        this.ipfs = new Ipfs({
            EXPERIMENTAL: { pubsub: true },
            start: false,
            repo,
            config: { Addresses: { Swarm } },
        })

        this.LOBBY_ID = `${pkg}_${version}_lobby` // something a peerId could never be
        this.pollInterval = pollInterval
        this.maxIdleTime = maxIdleTime
        this.onMessage = this.onMessage.bind(this)
        this.error = this.error.bind(this)

        this.ipfs.once('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', this.error)
        addEventListener('beforeunload', async e => {
            e.preventDefault()
            await this.disconnect()

            // Chrome requires returnValue to null so no prompt appears.
            return e.returnValue = undefined
        })
    }

    get isConnected() {
        return this.status == ConnectionStatus.ONLINE
    }

    get peers(): Map<PeerID, T> {
        if (this.isRoomReady) // faster than spread
            return new Map(this.readyPeers as unknown as [PeerID, T][])

        const peers = new Map
        if(this.allRooms.has(this.roomID))
            for(const peerId of this.allRooms.get(this.roomID)!)
                peers.set(peerId, this.allPeers.get(peerId))
        return peers
    }

    get isHost(): boolean {
        return this.roomID == this.id
    }

    get isRoomReady(): boolean {
        return !!this.readyPeers
    }

    get isLobby() {
        return this.roomID == this.LOBBY_ID
    }

    async connect() {
        if(this.status == ConnectionStatus.OFFLINE)
            await new Promise((resolve, reject) => {
                this.ipfs.once('ready', resolve)
                this.ipfs.once('error', reject)
            }).catch(this.error)

        if(this.status == ConnectionStatus.READY)
            try {
                this.status = ConnectionStatus.CONNECTING
                await this.ipfs.start()
                const {id} = await this.ipfs.id()
                this.id = id
                this.status = ConnectionStatus.ONLINE
            } catch(e) { this.error(e) }

        // disconnect after idling for some time, if still in Lobby
        if (this.maxIdleTime) {
            if (this.maxIdleTimeHandle)
                clearTimeout(this.maxIdleTimeHandle)

            this.maxIdleTimeHandle = setTimeout(() =>
                this.isLobby && this.allRooms.has(this.id)
                && this.allRooms.get(this.id)!.size == 0
                    && this.disconnect(),
                this.maxIdleTime
            ) as unknown as number
        }

        this.emit(EventNames.connected)
    }

    async disconnect() {
        if(this.isConnected) {
            this.status = ConnectionStatus.DISCONNECTING
            this.allRooms.clear()
            this.allPeers.clear()
            delete this.readyPeers
            delete this.roomID
            try {
                await this.ipfs.stop()
                this.status = ConnectionStatus.READY
            } catch(e) {
                this.error(e)
            } finally {
                this.emit(EventNames.disconnected)
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

        // Join my own room to check for people who wanna join me.
        try {
            await this.ipfs.pubsub.subscribe(this.id, this.onMessage, {discover: true})
            await this.ipfs.pubsub.subscribe(this.LOBBY_ID, this.onMessage, {discover: true})

            this.allRooms
                .set(this.id, new Set)
                .set(this.LOBBY_ID, new Set)

            this.roomID = this.LOBBY_ID
            await this.pollPeers([this.id, this.roomID])
        } catch(e) { this.error(e) }
        finally { this.joiningRoom = false }
    }

    // TODO: Refactor with joinLobby to be more DRY
    async joinPeer(peer: PeerID) {
        if (!peer)
            this.error(Errors.BAD_PEERID)

        if (this.joiningRoom)
            this.error(Errors.SYNC_JOIN)
        this.joiningRoom = true

        clearTimeout(this.maxIdleTimeHandle)
        await this.leaveRoom()
        await this.connect()

        try {
            await this.ipfs.pubsub.subscribe(peer, this.onMessage, {discover: true})
            if (!this.allRooms.has(peer))
                this.allRooms.set(peer, new Set)
            this.roomID = peer
            await this.pollPeers([this.roomID])
        } catch(e) { this.error(e) }
        finally { this.joiningRoom = false }
    }

    async broadcast(data: any) {
        if (!this.isRoomReady
        && (this.isLobby && !(data instanceof ReadyUpInfo || data instanceof Introduction)))
            this.error(Errors.MUST_BE_IN_ROOM)

        try { await this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer) }
        catch(e) { this.error(e) }
    }

    async readyUp() {
        if (!this.isConnected || !this.id)
            this.error(Errors.NOT_CONNECTED)

        if (!this.isLobby)
            this.error(Errors.READY_UP)

        if (!this.allRooms.has(this.id) || this.allRooms.get(this.id)!.size == 0)
            this.error(Errors.NO_PEERS_IN_ROOM)

        await this.leaveRoom()
        this.roomID = this.id
        await this.broadcast(new ReadyUpInfo(this.hashPeerMap()))
    }

    /**
     * Generates a random number in [0,1). Same as Math.random()
     * If `isInt` is true, than a integer in range [-2 ** 31, 2 ** 32) is generated.
     */
    random(isInt = false) {
        if(!this.isRoomReady)
            this.error(Errors.ROOM_NOT_READY)

        return isInt ? nextInt() : nextFloat()
    }

    /** Helper to ensure errors are thrown properly. */
    private error(error: Errors | Error, extra: object = {}): never {
        if (!(error instanceof Error))
            error = Error(error)
        for(const [prop, value] of Object.entries(extra))
            (error as any)[prop] = value
        this.emit(EventNames.error, error)
        throw error
    }

    private async leaveRoom() {
        if(this.roomID && (this.isConnected || this.status == ConnectionStatus.DISCONNECTING)) {
            try { await this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage) }
            catch(e) { this.error(e) }
            finally {
                this.allRooms.delete(this.roomID)
                delete this.readyPeers
                delete this.roomID
            }
        }
    }

    private onMessage({from, data, topicIDs}: Message) {
        const peer = from.toString()
        const msg = unpack(data)

        switch (msg.constructor) {
            case Introduction:
                if (peer == this.id) break // don't track self

                for(const room of topicIDs)
                    if (!this.allPeers.has(peer) && this.allRooms.has(room) && this.allRooms.get(room)!.has(peer)) {
                        this.allPeers.set(peer, (msg as Introduction<T>).name)
                        // this.emitPeerUpdate(peer, room, true)
                        setImmediate(() => this.emitPeerUpdate(peer, room, true))
                    }

                // Introduce ourselves if peer we know wants to meet us.
                // (Otherwise the poller will handle it)
                if (this.allPeers.has(peer) && (msg as Introduction<T>).infoRequest)
                    this.broadcast(new Introduction(this.name))
                break

            case ReadyUpInfo:
                if (this.isLobby)
                    this.error(Errors.UNEXPECTED_MESSAGE, {peer, data: msg})

                if (this.hashPeerMap() != (msg as ReadyUpInfo).hash)
                    this.error(Errors.LIST_MISMATCH)

                seedInt((msg as ReadyUpInfo).hash)

                this.readyPeers = new Map(this.peers)

                Promise.all([
                    this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage),
                    this.ipfs.pubsub.subscribe(
                        this.roomID,
                        ({from, data}) => this.emit(EventNames.data, {
                            data: unpack(data),
                            peer: from.toString(),
                        })
                    ),
                ])
                    .then(() => this.emit(EventNames.roomReady))
                    .catch(this.error)
                break

            default:
                this.error(Errors.UNEXPECTED_MESSAGE, {peer, data: msg})
        }
    }

    private emitPeerUpdate(peer: PeerID, room: RoomID, joined: boolean) {
        this.emit(joined ? EventNames.peerJoin : EventNames.peerLeft, peer)
        this.emit(EventNames.peerChange, {peer, joined})

        if (room == this.LOBBY_ID) {
            this.emit(joined ? EventNames.lobbyJoin : EventNames.lobbyLeft, peer)
            this.emit(EventNames.lobbyChange, {peer, joined})

        } else if (room == this.id) {
            this.emit(joined ? EventNames.meJoin : EventNames.meLeft, peer)
            this.emit(EventNames.meChange, {peer, joined})
        }
    }

    private async pollPeers(rooms: RoomID[]) {
        if(!this.isConnected) // Stop polling early
            return

        const roomsToWatch: RoomID[] = []

        for (const room of rooms.filter(room => this.allRooms.has(room))) {
            try {
                let missingPeerName = false
                const currentPeers = this.allRooms.get(room)!
                const updatedPeerList = await this.ipfs.pubsub.peers(room).catch(this.error)

                const peersJoined = updatedPeerList.filter(peer => !currentPeers.has(peer))
                const peersLeft = [...currentPeers].filter(peer => !updatedPeerList.includes(peer))

                for (const peer of peersJoined) {
                    if (peer == this.id) continue // don't track self

                    // An unknown peer joined a room
                    if (!this.allPeers.has(peer))
                        missingPeerName = true

                    // A peer we know joined this room
                    else if (!currentPeers.has(peer))
                        // Make sure currentPeers is updated
                        setImmediate(() => this.emitPeerUpdate(peer, room, true))

                    currentPeers.add(peer)
                }

                for (const peer of peersLeft) {
                    if (peer == this.id) continue // don't track self

                    if (currentPeers.has(peer))
                        this.emitPeerUpdate(peer, room, false)

                    currentPeers.delete(peer)
                    
                    if (room == peer) // the host left, go back to the lobby since it will never be ready
                        await this.joinLobby()
                }

                // Introduce myself to everyone so everyone else will as well.
                if (missingPeerName && room == this.roomID)
                    await this.broadcast(new Introduction(this.name, true))

                roomsToWatch.push(room) // only continue watching if error free
            } catch(originalError) { 
                this.error(Errors.POLLING, {originalError})
            }
        }

        if (roomsToWatch.length)
            setTimeout(() => this.pollPeers(roomsToWatch), this.pollInterval)
    }

    /**
     * Generates a number based on the peers connected to the current room.
     * Meaning this value should be consistent with all other peers as well.
     */
    private hashPeerMap() {
        // Alphabet of Base58 characters used in peer id's
        const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

        let allIdHash = 1
        let idHash
        for (const id of [...this.peers.keys(), this.id].sort()) {
            idHash = 0
            for(let i = 0; i < id.length; i++)
                idHash += (ALPHABET.indexOf(id[i]) + 1) * (ALPHABET.length * i + 1)
            allIdHash *= idHash
            allIdHash %= 0xFFFFFFFF
        }
        return allIdHash - 0x7FFFFFFF
    }
}
