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

    private status: ConnectionStatus = ConnectionStatus.OFFLINE
    private roomID: string = ''
    private id: PeerID = ''

    private readonly pollInterval: number
    private readonly LOBBY_ID: RoomID

    private readonly maxIdleTime: number
    private maxIdleTimeHandle?: number

    constructor(
        public readonly name: T,
        pkg: string,
        {
            allowSameBrowser = false,
            repo = `/tmp/p2p-lobby/${version}/${pkg}${allowSameBrowser ? '/' + Math.random().toString().substr(2) : ''}`,
            Swarm = ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
            pollInterval = 1000,
            maxIdleTime = 60 * 1000,
        }: {
            repo?: string
            Swarm?: string[]
            pollInterval?: number
            allowSameBrowser?: boolean
            maxIdleTime?: number
        } = {},
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

        // disconnect after idling for some time, if still in Lobby
        if(this.maxIdleTimeHandle)
            clearTimeout(this.maxIdleTimeHandle)
        this.maxIdleTimeHandle = setTimeout(
            () => this.isLobby && this.disconnect,
            this.maxIdleTime
        ) as unknown as number
    }

    async disconnect() {
        if(this.isConnected) {
            this.status = ConnectionStatus.DISCONNECTING
            this.allRooms.clear()
            this.allPeers.clear()
            delete this.roomID
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
        this.roomID = this.LOBBY_ID
        await this.pollPeers()
    }

    // TODO: Refactor with joinLobby to be more DRY
    async joinPeer(peer: PeerID) {
        if (peer) {
            await this.leaveRoom()
            await this.connect()

            await this.ipfs.pubsub.subscribe(peer, this.onMessage, {discover: true})
            if (!this.allRooms.has(peer))
                this.allRooms.set(peer, new Set)
            this.roomID = peer
            await this.pollPeers()
        }
    }

    // TODO: Disable broadcasting in lobby
    async broadcast(data: any) {
        if (!this.isConnected || !this.roomID)
            this.error('Must be in a room to broadcast')

        await this.ipfs.pubsub.publish(this.roomID, pack(data) as Buffer)
    }

    async readyUp() {
        if (!this.isConnected || !this.id)
            this.error('Can not ready up until online. Wait for `connect` method to resolve')

        if (!this.isLobby)
            this.error('Must be in lobby to ready up')

        if (this.allRooms.has(this.id) && this.allRooms.get(this.id)!.size == 0)
            this.error('Can not ready up since no one has joined your room')

        await this.leaveRoom()
        this.roomID = this.id
        await this.broadcast(new ReadyUpInfo(this.allRooms.get(this.roomID)!))
    }

    /** Generates a random number in [0,1) */
    random() {
      if(!this.isRoomReady)
          this.error('Can not generate random numbers until room is ready')

      return nextFloat()
    }

    /** Generates a random positive integer in [0,`max`) */
    randomUInt(max = 0xFFFFFFFF) {
      if(!this.isRoomReady)
          this.error('Can not generate random numbers until room is ready')

      return Math.abs(nextInt()) % max
    }

    /** Helper to ensure errors are thrown properly. */
    private error(error: string | Error) {
        if (typeof error == 'string')
            error = Error(error)
        this.emit(EventNames.error, error)
        throw error
    }

    private async leaveRoom() {
        if(this.roomID && (this.isConnected || this.status == ConnectionStatus.DISCONNECTING)) {
            await this.ipfs.pubsub.unsubscribe(this.roomID, this.onMessage)
            this.allRooms.delete(this.roomID)
            delete this.readyPeers
            delete this.roomID
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
                const myPeers = [...this.allRooms.get(this.roomID)!]
                const readyPeers = (msg as ReadyUpInfo).peers
                if (!this.isHost) {
                    readyPeers.delete(this.id) // remove self
                    readyPeers.add(peer)       // add peer we joined
                }

                if (readyPeers.size != myPeers.length || !([...myPeers].every(myPeer => readyPeers.has(myPeer))))
                    this.error('Our list or peers is inconsistent with the peer we joined')

                seedInt(this.hashPeerMap())
                this.emit(EventNames.roomReady)
                break

            default: // TODO: Refactor so this should is only done outside of the lobby
                if (topicIDs.includes(this.roomID))
                    this.emit(EventNames.data, data, peer)
        }
    }

    private async pollPeers(room = this.roomID) {
        if (!this.allRooms.has(room))
            return

        let missingPeerName = false
        const currentPeers = this.allRooms.get(room)!
        const updatedPeerList = await this.ipfs.pubsub.peers(room)

        const peersJoined = updatedPeerList.filter(peer => !currentPeers.has(peer))
        const peersLeft = [...currentPeers].filter(peer => !updatedPeerList.includes(peer))

        for (const peer of peersJoined) {
            if (peer == this.id) continue // don't track self

            // An unknown peer joined a room
            if (!this.allPeers.has(peer))
                missingPeerName = true

            // A peer we know joined this room
            else if (!currentPeers.has(peer) && room == this.roomID) {
                currentPeers.add(peer) // add here so we have it for the event
                this.emit(EventNames.peerJoin, peer)
                this.emit(EventNames.peerChange, peer, true)
            }

            currentPeers.add(peer)
        }

        for (const peer of peersLeft) {
            if (peer == this.id) continue // don't track self

            // TODO: add events for peers leaving lobby & own room
            if (currentPeers.has(peer) && room == this.roomID) {
                this.emit(EventNames.peerLeft, peer)
                this.emit(EventNames.peerChange, peer, false)
                currentPeers.delete(peer) // remove so we don't have it for event
                this.allPeers.delete(peer) // safe to remove here incase they rejoin with new name
            }

            currentPeers.delete(peer)
        }

        // Introduce myself to everyone so everyone else will as well.
        if (missingPeerName && room == this.roomID)
            await this.broadcast(new Introduction(this.name, true))

        setTimeout(() => this.pollPeers(room), this.pollInterval)
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
