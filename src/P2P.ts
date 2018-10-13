import * as Ipfs from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'

type Constructor<Instance> = { new(): Instance }
type PeerID = string

interface Message {
    data: Buffer
    from: Buffer
    seqno: Buffer
    topicIDs: string[]
}

export const enum EventNames {
    error,
    peerJoin,
    peerLeft,
    peerChange,
    data,
}

interface Events {
    [EventNames.error]: Error
    [EventNames.peerJoin]: string
    [EventNames.peerLeft]: string
    [EventNames.peerChange]: (peerId: PeerID, joined: boolean) => void
    [EventNames.data]: (data: any, from: PeerID) => void
}

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

export default class P2P<T>
    extends (EventEmitter as any as Constructor<StrictEventEmitter<EventEmitter, Events>>) {

    public readonly ipfs: Ipfs

    public readonly peers: Map<PeerID, string> = new Map
    public readonly roomPeers: Map<PeerID, string> = new Map

    protected status: ConnectionStatus = ConnectionStatus.OFFLINE
    protected roomID: string = ''
    protected id?: PeerID

    protected readonly pollInterval: number
    protected pollIntervalHandle?: number

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

        this.ipfs.on('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', err => this.emit(EventNames.error, err))

        this.pollInterval = ipfsConfig.pollInterval
        this.onLobbyMessage = this.onLobbyMessage.bind(this)
        this.onMessage = this.onMessage.bind(this)

        window.onclose = () => this.disconnect()
    }

    get isConnected() {
        return this.status == ConnectionStatus.ONLINE
    }

    protected get isLobby() {
        return this.roomID == P2P.LOBBY_ID
    }

    async connect() {
        if(this.status == ConnectionStatus.READY) {
            this.status = ConnectionStatus.CONNECTING
            return this.ipfs.start().then(() => {
                this.status = ConnectionStatus.ONLINE
                return this.ipfs.id().then(({id}) => this.id = id)
            })
        }
    }

    async disconnect() {
        if(this.status == ConnectionStatus.ONLINE) {
            this.status = ConnectionStatus.DISCONNECTING
            return this.leaveRoom()
                .then(() => this.ipfs.stop())
                .then(() => {
                    this.status = ConnectionStatus.OFFLINE
                    clearInterval(this.pollIntervalHandle)
                })
        }
    }

    async joinLobby() {
        return this.joinRoom(P2P.LOBBY_ID, this.onLobbyMessage, true)
            .then(() => this.pollIntervalHandle = window.setInterval(() => this.pollPeers(), this.pollInterval))
            .then(() => this.broadcast({name: this.name}))
    }

    async joinPeer(peer: PeerID) {
        const join = this.joinRoom(peer, this.onMessage, true)
        if(this.isLobby)
            return this.broadcast({name: this.name, room: peer})
                .then(() => this.leaveRoom())
                .then(() => join)
        return join
    }

    async broadcast(data: any) {
        return this.ipfs.pubsub.publish(this.roomID, Buffer.from(data))
    }

    async readyUp() {
        if (this.roomPeers.size == 0)
            throw Error('Can not ready up since no one has joined your room')

        if(this.status != ConnectionStatus.ONLINE && this.id)
            return this.joinRoom(this.id, this.onMessage, false)
                .then(() => this.broadcast(this.roomPeers))
    }

    private async joinRoom(name: string, handler: (msg: Message) => void, discover: boolean) {
        return this.connect()
            .then(() => this.ipfs.pubsub.subscribe(name, handler, {discover}))
            .then(() => {
                this.roomID = name
                this.peers.clear()
            })
    }

    private async leaveRoom() {
        if(this.roomID)
            return this.ipfs.pubsub.unsubscribe(this.roomID, this.isLobby ? this.onLobbyMessage : this.onMessage)
                .then(() => this.peers.clear())
    }

    private onMessage({from, data}: Message) {

    }

    private onLobbyMessage({from, data}: Message) {
        const peer = from.toString()
        const msg: {
            name: string
            room?: string
        } = JSON.parse(data.toString())

        if (msg.room) { // joining a room
            this.peerLeft(peer)
            if(this.id == msg.room) // joining my room
                this.roomPeers.set(peer, msg.name)
        } else if (msg.name) // joining the lobby
            this.peerJoin(peer, msg.name)
    }

    private peerJoin(peer: PeerID, name: string) {
        if (!this.peers.has(peer)) {
            this.emit(EventNames.peerJoin, peer)
            this.emit(EventNames.peerChange, peer, true)
        }
        this.peers.set(peer, name)
    }

    private peerLeft(peer: PeerID) {
        if (this.peers.has(peer)) {
            this.emit(EventNames.peerLeft, peer)
            this.emit(EventNames.peerChange, peer, false)
        }
        this.peers.delete(peer)
    }

    private async pollPeers() {
        return this.ipfs.pubsub.peers(this.roomID)
            .then(peerList => {
                for (const peer of peerList.filter(peer => !this.peers.has(peer)))
                    this.peerJoin(peer, `Player #${P2P.counter++}`)

                for (const peer of [...this.peers.keys()].filter(peer => peerList.indexOf(peer) == -1))
                    this.peerLeft(peer)
            })
    }
}
