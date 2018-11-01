import * as Ipfs from 'ipfs'
import StrictEventEmitter from 'strict-event-emitter-types'
import {EventEmitter} from 'events'
import {Buffer} from 'buffer'
import {Packable, pack, unpack} from './packer'
import {Introduction, ReadyUpInfo} from './messages'
import {seedInt, nextFloat, nextInt} from './rng'
import {Message, PeerID} from 'ipfs'
import {version} from '../package.json'

type Constructor<Instance> = { new(...args: any[]): Instance }
type RoomID = PeerID // Alias for the names of rooms

const enum ConnectionStatus { OFFLINE, READY, DISCONNECTING, CONNECTING, ONLINE }

export const enum EventNames {
    error,
    data,
    roomReady,

    // Peer connections
    peerJoin,
    peerLeft,
    peerChange,
}

interface Events {
    [EventNames.error]: Error
    [EventNames.peerJoin]: PeerID
    [EventNames.peerLeft]: PeerID
    [EventNames.peerChange]: (peerId: PeerID, joined: boolean) => void
    [EventNames.data]: (data: any, from: PeerID) => void
    [EventNames.roomReady]: void
}

export default class P2P<T extends Packable>
    extends (EventEmitter as Constructor<StrictEventEmitter<EventEmitter, Events>>) {

    public readonly ipfs: Ipfs

    private readonly allPeers: Map<PeerID, T> = new Map
    private readonly allRooms: Map<RoomID, Set<PeerID>> = new Map
    private readyPeers?: Map<PeerID, T>

    protected status: ConnectionStatus = ConnectionStatus.OFFLINE
    protected roomID: string = ''
    protected id: PeerID = ''

    protected readonly pollInterval: number
    private readonly LOBBY_ID: RoomID

    constructor(
        public readonly name: T,
        pkg: string,
        ipfsConfig: {
            repo: string
            Swarm: string[]
            pollInterval: number
        } = {
            repo: `/tmp/p2p-lobby/${version}/${pkg}`,
            Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
            pollInterval: 1000,
        },
    ) {
        super()

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

        this.LOBBY_ID = `${pkg}_${version}_lobby` // something a peerId could never be
        this.pollInterval = ipfsConfig.pollInterval
        this.onMessage = this.onMessage.bind(this)

        this.ipfs.once('ready', () => this.status = ConnectionStatus.READY)
        this.ipfs.on('error', err => this.emit(EventNames.error, err))
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

    protected get isLobby() {
        return this.roomID == this.LOBBY_ID
    }

    async connect() {
        if(this.status == ConnectionStatus.OFFLINE)
            await new Promise((resolve, reject) => {
                this.ipfs.once('ready', resolve)
                this.ipfs.once('error', reject)
            })

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
            if(this.isLobby) { // Be sure to leave own room too
                await this.leaveRoom()
                this.roomID = this.id
            }
            await this.leaveRoom()
            await this.ipfs.stop()
            this.removeAllListeners()
            this.status = ConnectionStatus.OFFLINE
        }
    }

    async joinLobby() {
        await this.leaveRoom()
        await this.connect()

        // Join my own room to check for people who wanna join me.
        await this.ipfs.pubsub.subscribe(this.id, this.onMessage, {discover: true})
        await this.ipfs.pubsub.subscribe(this.LOBBY_ID, this.onMessage, {discover: true})

        this.allRooms
            .set(this.id, new Set)
            .set(this.LOBBY_ID, new Set)

        await this.pollPeers(this.id)
        await this.pollPeers(this.LOBBY_ID)
        this.roomID = this.LOBBY_ID
    }

    // TODO: Refactor with joinLobby to be more DRY
    async joinPeer(peer: PeerID) {
        await this.leaveRoom()
        await this.connect()

        await this.ipfs.pubsub.subscribe(peer, this.onMessage, {discover: true})
        if (!this.allRooms.has(peer))
            this.allRooms.set(peer, new Set)
        await this.pollPeers(peer)
        this.roomID = peer

        await this.broadcast(new Introduction(this.name))
    }

    // TODO: Disable broadcasting in lobby
    async broadcast(data: any) {
        if (!this.isConnected || !this.roomID)
            throw Error('Must be in a room to broadcast')

        await this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer)
    }

    async readyUp() {
        if (!this.isConnected || !this.id)
            throw Error('Can not ready up until online. Wait for `connect` method to resolve')

        if (!this.isLobby)
            throw Error('Must be in lobby to ready up')

        if (this.allRooms.has(this.id) && this.allRooms.get(this.id)!.size == 0)
            throw Error('Can not ready up since no one has joined your room')

        await this.leaveRoom()
        this.roomID = this.id
        await this.broadcast(new ReadyUpInfo(this.peers))
    }

    /** Generates a random number in [0,1) */
    random() {
      if(!this.isRoomReady)
          throw Error('Can not generate random numbers until room is ready')

      return nextFloat()
    }

    /** Generates a random positive integer in [0,`max`) */
    randomUInt(max = 0xFFFFFFFF) {
      if(!this.isRoomReady)
          throw Error('Can not generate random numbers until room is ready')

      return Math.abs(nextInt()) % max
    }

    private async leaveRoom() {
        if(this.roomID && (this.isConnected || this.status == ConnectionStatus.DISCONNECTING)) {
            await this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage)
            this.allRooms.delete(this.roomID)
            this.readyPeers = undefined
            this.roomID = ''
        }
    }

    private onMessage({from, data, topicIDs}: Message) {
        const peer = from.toString()
        const msg = unpack(data)

        switch (msg.constructor) {
            case Introduction:
                if (peer == this.id) break // don't track self

                if (topicIDs.includes(this.roomID) && !this.allPeers.has(peer)
                   && this.allRooms.get(this.roomID)!.has(peer)) {
                    this.allPeers.set(peer, (msg as Introduction<T>).name)
                    this.emit(EventNames.peerJoin, peer)
                    this.emit(EventNames.peerChange, peer, true)
                }

                // Introduce ourselves if peer we know wants to meet us.
                // (Otherwise the poller will handle it)
                if (this.allPeers.has(peer) && (msg as Introduction<T>).infoRequest)
                    this.broadcast(new Introduction(this.name))
                break

            case ReadyUpInfo:
                this.allRooms.clear()
                this.allPeers.clear()
                this.readyPeers = (msg as ReadyUpInfo<T>).peers

                this.allRooms.set(this.roomID, new Set)
                for (const [peerId, data] of (msg as ReadyUpInfo<T>).peers) {
                    this.allPeers.set(peerId, data)
                    this.allRooms.get(this.roomID)!.add(peerId)
                }
                seedInt(this.hashPeerMap())
                this.emit(EventNames.roomReady)
                break

            default:
                if (topicIDs.includes(this.roomID))
                    this.emit(EventNames.data, data, peer)
        }
    }

    private async pollPeers(room = this.roomID) {
        if (this.allRooms.has(room)) {
            let missingPeerName = false
            const updatedPeerList = await this.ipfs.pubsub.peers(room)

            const peersJoined = updatedPeerList.filter(peer => !this.allPeers.has(peer))
            const peersLeft = [...this.allPeers.keys()].filter(peer => !updatedPeerList.includes(peer))

            for (const peer of peersJoined) {
                if (peer == this.id) continue // don't track self

                // Just add a peer to track in this room
                this.allRooms.get(room)!.add(peer)

                if (!this.allPeers.has(peer))
                    missingPeerName = true
            }

            for (const peer of peersLeft) {
                if (peer == this.id) continue // don't track self

                if (this.allRooms.get(room)!.has(peer) && room == this.roomID) {
                    this.emit(EventNames.peerLeft, peer)
                    this.emit(EventNames.peerChange, peer, false)
                }
                // TODO: add events for peers leaving lobby & own room

                this.allRooms.get(room)!.delete(peer)
            }

            // Introduce myself to everyone so everyone else will as well.
            if (missingPeerName && room == this.roomID)
                await this.broadcast(new Introduction(this.name, true))

            setTimeout(() => this.pollPeers(room), this.pollInterval)
        }
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
        for (const id of [...this.peers.keys(), this.id]) {
            idHash = 0
            for(let i = 0; i < id.length; i++)
                idHash += (ALPHABET.indexOf(id[i]) + 1) * (ALPHABET.length * i + 1)
            allIdHash *= idHash
            allIdHash %= 0xFFFFFFFF
        }
        return allIdHash - 0x7FFFFFFF
    }
}
