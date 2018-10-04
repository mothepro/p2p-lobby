// Helper Types
type Constructor<Instance> = { new(): Instance }
type UglyCallback<T> = (err: Error, ret: T) => void

declare module 'ipfs' {
    import StrictEventEmitter from 'strict-event-emitter-types'
    import {EventEmitter} from 'events'
    import {Buffer} from 'buffer'

    type datastoreFs = any

    class Repo {
        constructor(path: string, options?: {
            lock: string
            storageBackends: {
                root: datastoreFs
                blocks: datastoreFs
                keys: datastoreFs
                datastore: datastoreFs
            }
        })
    }

    class Multiaddr {
        constructor(str: string)
        buffer: Buffer
        protos(): {
            code: number
            name: string
            size: number
        }[]
        nodeAddress(): {
            family: string
            port: number
            address: string
        }
    }

    class PeerInfo {
        constructor(id: string | PeerId, cb?: UglyCallback<PeerInfo>)
        id: string
        isConnected(): boolean
        disconnect(): void
        connect(ma: Multiaddr | string): void
        multiaddrs: Set<Multiaddr>
    }

    interface PeerIdJSON {
        id: string
        pubKey: string
        privKey: string
    }

    class PeerId {
        constructor(id: Buffer, privKey?: string, pubKey?: string)

        static create(opts?: {bits: number}, cb?: UglyCallback<string>): PeerId
        static createFromHexString(str: string): PeerId
        static createFromB58String(str: string): PeerId
        static createFromPrivKey(str: string): PeerId
        static createFromPubKey(str: string): PeerId
        static createFromJSON(obj: PeerIdJSON): PeerId

        toHexString(): string
        toBytes(): Buffer
        toB58String(): string
        toPrint(): string
        toJSON(): PeerIdJSON
        isEqual(): boolean
    }

    class ConnManager {
        maxPeers: number
        maxPeersPerProtocol: { [protocalTag: string]: number }
        minPeers: number
        maxData: number
        maxSentData: number
        maxReceivedData: number
        maxEventLoopDelay: number
        pollInterval: number
        movingAverageInterval: number
        defaultPeerValue: number
    }

    interface IPFSConstructorParams {
        repo: string | Repo
        init?: boolean | {
            emptyRepo: boolean
            bits: number
            privateKey: string | PeerId
            pass: string
        }
        start?: boolean
        pass?: string
        relay?: {
            enabled: boolean
            hop: {
                enabled: boolean
                active: boolean
            }
        }
        preload?: {
            enabled: boolean
            addresses: Multiaddr[]
        }
        EXPERIMENTAL?: {
            pubsub: boolean
            sharding: boolean
            dht: boolean
        }
        modules?: {
            transport: any // libp2p.Transport
            peerDiscovery: any // libp2p.PeerDiscovery
        }
        config?: {
            peerDiscovery: {
                [peerDiscoveryTag: string]: {
                    enabled: boolean
                    config: any
                }
            }
        }
        connectionManager?: ConnManager
    }

    interface IPFSEvents {
        ready: void
        init: void
        start: void
        stop: void
        error: Error
    }

    interface IPFSPubSub {
        subscribe: (
            topic: string,
            handler: (msg: any) => void,
            options?: {discover: boolean},
            cb?: UglyCallback<never>
        ) => void | Promise<void>
        unsubscribe: (
            topic: string,
            handler: (msg: any) => void,
            cb?: UglyCallback<never>
        ) => void | Promise<void>
        publish: (
            topic: string,
            data: Buffer,
            cb?: UglyCallback<never>
        ) => void | Promise<void>
        ls: (cb?: UglyCallback<string[]>) => void | Promise<string[]>
        peers: (cb?: UglyCallback<string[]>) => void | Promise<string[]>
    }

    class Ipfs
        extends (EventEmitter as any as Constructor<StrictEventEmitter<EventEmitter, IPFSEvents>>) {
        constructor(opts: IPFSConstructorParams)
        start(cb?: UglyCallback<never>): void
        stop(cb?: UglyCallback<never>): void
        pubsub: IPFSPubSub
        id: () => Promise<{
            id: string
            publicKey: string
            addresses: string[]
            agentVersion: string
            protocolVersion: '9000'
        }>

        // To be continued...
    }

    // https://github.com/Microsoft/TypeScript/issues/5073
    namespace Ipfs {}

    export = Ipfs
}
