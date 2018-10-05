declare module 'ipfs-repo' {
    import {Buffer} from 'buffer'
    type Constructor<Instance> = { new(): Instance }
    type UglyCallback<T> = (err: Error, ret: T) => void
    type datastoreFs = any // Built in Datastore object

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
        init(cb: UglyCallback<never>): void
        open(cb: UglyCallback<never>): void
        close(cb: UglyCallback<never>): void
        exists(cb: UglyCallback<boolean>): void

        datastore: datastoreFs

        put(key: string | Buffer, value: Buffer, cb: UglyCallback<never>): void
        get(key: string | Buffer, cb: UglyCallback<Buffer>): void
    }
}
