import * as Ipfs from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'
import {Packable, pack, unpack} from './packer'
import {RoomChange, NameChange, ReadyUpInfo} from './messages'
import {Message, PeerID} from 'ipfs'

type Constructor<Instance> = { new(...args: any[]): Instance }
type RoomID = PeerID // Alias for the names of rooms

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

export const enum EventNames {
    error,
    data,
    peerJoin,
    peerLeft,
    peerChange,
    roomReady,
}

interface Events {
    [EventNames.error]: Error
    [EventNames.peerJoin]: string
    [EventNames.peerLeft]: string
    [EventNames.peerChange]: (peerId: PeerID, joined: boolean) => void
    [EventNames.data]: (data: any, from: PeerID) => void

    // this must be any, see: https://github.com/Microsoft/TypeScript/issues/26154
    [EventNames.roomReady]: Map<PeerID, any>
}

export default class P2P<T extends Packable>
    extends (EventEmitter as Constructor<StrictEventEmitter<EventEmitter, Events>>) {

    public readonly ipfs: Ipfs

    private readonly allPeers: Map<PeerID, T> = new Map
    private readonly allRooms: Map<RoomID, Set<PeerID>> = new Map

    protected status: ConnectionStatus = ConnectionStatus.OFFLINE
    protected roomID: string = ''
    protected id: PeerID = ''

    protected readonly pollInterval: number
    protected pollHandles: Map<RoomID, number> = new Map

    private static readonly LOBBY_ID = 'l.__lobby+ID'
    private static counter = 1

    constructor(
        public readonly name: T,
        pkg: string,
        ipfsConfig: {
            repo: string
            Swarm: string[]
            pollInterval: number
        } = {
            repo: `/tmp/p2p-lobby/${pkg}`,
            Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
            pollInterval: 1000,
        },
    ) {
        super()

        if(typeof this.name === 'string' && this.name == P2P.LOBBY_ID)
            throw Error(`Your name can not be "${this.name}"`)

        this.ipfs = new Ipfs({
            EXPERIMENTAL: { pubsub: true },
            start: false,
            repo: ipfsConfig.repo,
            config: {
                Addresses: {
                    Swarm: ipfsConfig.Swarm
                }
            },
        })

        this.pollInterval = ipfsConfig.pollInterval
        this.onMessage = this.onMessage.bind(this)

        this.ipfs.on('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', err => this.emit(EventNames.error, err))
        addEventListener('beforeunload', async e => {
            e.preventDefault()
            e.returnValue = ''; // Chrome requires returnValue to be set.
            await this.disconnect()
        })
    }

    get isConnected() {
        return this.status == ConnectionStatus.ONLINE
    }

    get peers(): ReadonlyMap<PeerID, T> {
        return this.peersInRoom(this.roomID)
    }

    get isHost(): boolean {
        return this.roomID == this.id
    }

    protected get isLobby() {
        return this.roomID == P2P.LOBBY_ID
    }

    async connect() {
        if(this.status == ConnectionStatus.READY) {
            this.status = ConnectionStatus.CONNECTING
            await this.ipfs.start()
            const {id} = await this.ipfs.id()
            this.id = id
            this.status = ConnectionStatus.ONLINE
        }
    }

    async disconnect() {
        if(this.isConnected) {
            this.status = ConnectionStatus.DISCONNECTING
            await this.leaveRoom()
            await this.ipfs.stop()
            for(const handle of this.pollHandles.values())
                clearInterval(handle)
            this.pollHandles.clear()
            this.removeAllListeners()
            this.status = ConnectionStatus.OFFLINE
        }
    }

    async joinLobby() {
        await this.leaveRoom()
        await this.joinRoom(this.id) // Join my own room to check for people who wanna join me.
        await this.joinRoom(P2P.LOBBY_ID)
        await this.broadcast(new NameChange(this.name))
    }

    async joinPeer(peer: PeerID) {
        await this.broadcast(new RoomChange(peer, this.name))
        await this.leaveRoom()
        await this.joinRoom(peer)
    }

    async broadcast(data: any) {
        if (this.isConnected && this.roomID)
            await this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer)
    }

    async readyUp() {
        if (!this.isConnected || !this.id)
            throw Error('Can not ready up until online. Wait for `connect` method to resolve')

        if (this.allRooms.has(this.id) && this.allRooms.get(this.id)!.size <= 1)
            throw Error('Can not ready up since no one has joined your room')

        if (this.isLobby)
            await this.leaveRoom()
        await this.broadcast(new ReadyUpInfo(this.peersInRoom(this.id)))
        this.roomID = this.id
    }

    private async joinRoom(room: RoomID) {
        await this.connect()
        await this.ipfs.pubsub.subscribe(room, this.onMessage, {discover: true})
        this.pollHandles.set(room, window.setInterval(() => this.pollPeers(), this.pollInterval))
        if (!this.allRooms.has(room))
            this.allRooms.set(room, new Set)
        this.roomID = room
    }

    private async leaveRoom() {
        if(this.isConnected && this.roomID) {
            await this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage)
            if(this.pollHandles.has(this.roomID)) {
                clearInterval(this.pollHandles.get(this.roomID))
                this.pollHandles.delete(this.roomID)
            }
            this.roomID = ''
        }
    }

    private onMessage({from, data, topicIDs}: Message) {
        const peer = from.toString()
        const msg = unpack(data)

        switch (msg.constructor) {
            case RoomChange:
                this.peerJoin(peer, (msg as RoomChange<T>).roomID, (msg as RoomChange<T>).name)

                // The peer is leaving all other rooms
                for (const room of topicIDs)
                    if (room != (msg as RoomChange<T>).roomID)
                        this.peerLeft(peer, room)
                break

            case NameChange:
                for (const room of topicIDs)
                    if (topicIDs.includes(room))
                        this.peerJoin(peer, room, (msg as NameChange<T>).name)
                break

            case ReadyUpInfo:
                this.allRooms.set(this.roomID, new Set(msg.peers.keys))
                for (const [peerId, data] of msg.peers)
                    this.allPeers.set(peerId, data)
                break

            default:
                if (topicIDs.includes(this.roomID))
                    this.emit(EventNames.data, data, peer)
        }
    }

    private peerJoin(peer: PeerID, room: RoomID, name: T) {
        if (!this.allRooms.get(room)!.has(peer) && room == this.roomID) {
            this.emit(EventNames.peerJoin, peer)
            this.emit(EventNames.peerChange, peer, true)
        }
        this.allRooms.get(room)!.add(peer)
        this.allPeers.set(peer, name)
    }

    private peerLeft(peer: PeerID, room: RoomID) {
        if (this.allRooms.get(room)!.has(peer) && room == this.roomID) {
            this.emit(EventNames.peerLeft, peer)
            this.emit(EventNames.peerChange, peer, false)
        }
        this.allPeers.delete(peer)
        this.allRooms.get(room)!.delete(peer)
    }

    private async pollPeers(roomID = this.roomID) {
        const peerList = await this.ipfs.pubsub.peers(roomID)

        for (const peer of peerList.filter(peer => !this.allPeers.has(peer)))
            this.peerJoin(peer, roomID, `Player #${P2P.counter++}` as T)

        for (const peer of [...this.allPeers.keys()].filter(peer => peerList.includes(peer)))
            this.peerLeft(peer, roomID)
    }

    private peersInRoom(room: RoomID): Map<PeerID, T> {
        const peers = new Map
        if(this.allRooms.has(room))
            for(const peerId of this.allRooms.get(room)!)
                peers.set(peerId, this.allPeers.get(peerId))
        return peers
    }
}
