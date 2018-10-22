import * as Ipfs from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'
import {Packable, pack, unpack} from './packer'
import {RoomChange, NameChange} from './messages'
import {Message} from 'ipfs'

type Constructor<Instance> = { new(): Instance }
type PeerID = string

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

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

export default class P2P<T extends Packable>
    extends (EventEmitter as Constructor<StrictEventEmitter<EventEmitter, Events>>) {

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
        if(this.status == ConnectionStatus.ONLINE) {
            this.status = ConnectionStatus.DISCONNECTING
            await this.leaveRoom()
            await this.ipfs.stop()
            clearInterval(this.pollIntervalHandle)
            this.removeAllListeners()
            this.status = ConnectionStatus.OFFLINE
        }
    }

    async joinLobby() {
        await this.joinRoom(P2P.LOBBY_ID, true)
        this.pollIntervalHandle = window.setInterval(() => this.pollPeers(), this.pollInterval)
        await this.broadcast(new NameChange(this.name))
    }

    async joinPeer(peer: PeerID) {
        if(this.isLobby) {
            await this.broadcast(new RoomChange(peer, this.name))
            await this.leaveRoom()
        }
        await this.joinRoom(peer, false)
    }

    async broadcast(data: any) {
        await this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer)
    }

    async readyUp() {
        if (this.roomPeers.size == 0)
            throw Error('Can not ready up since no one has joined your room')

        if(this.status == ConnectionStatus.ONLINE && this.id) {
            await this.joinRoom(this.id, false)
            await this.broadcast(this.roomPeers)
        }
    }

    private async joinRoom(name: string, discover: boolean) {
        await this.connect()
        await this.ipfs.pubsub.subscribe(name, this.onMessage, {discover})
        this.roomID = name
        this.peers.clear()
    }

    private async leaveRoom() {
        if(this.roomID) {
            await this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage)
            this.peers.clear()
        }
    }

    private onMessage({from, data}: Message) {
        const peer = from.toString()
        const msg = unpack(data)

        switch (msg.constructor) {
            case RoomChange:
                this.peerLeft(peer)
                if(this.id == msg.room) // joining my room
                    this.roomPeers.set(peer, msg.name)
                break

            case NameChange:
                this.peerJoin(peer, msg.name)
                break

            default:
                this.emit(EventNames.data, data, peer)
        }
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

    private async pollPeers(roomID = this.roomID) {
        const peerList = await this.ipfs.pubsub.peers(roomID)

        for (const peer of peerList.filter(peer => !this.peers.has(peer)))
            this.peerJoin(peer, `Player #${P2P.counter++}`)

        for (const peer of [...this.peers.keys()].filter(peer => peerList.indexOf(peer) == -1))
            this.peerLeft(peer)
    }
}
