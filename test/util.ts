import Emitter from 'fancy-emitter'
import P2P from '../src/P2P'

// Remove default bind to the `beforeunload` event
declare const global: NodeJS.Global & { addEventListener: Function }
global.addEventListener = () => {}

const RUN_TIME = Date.now()
let total = 0

/** Make a P2P Lobby with defaults to communicate to other nodes within the same client. */
export const createNode = () =>
    new P2P(`node-#${++total}`, 'p2p-lobby-local', {
        repo: `test-data/${RUN_TIME}/${total}`,
        Swarm: ['/ip4/127.0.0.1/tcp/0'],
    })

/** Wait for some time */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** @returns the first `times` values from an emitter. */
// TODO assert emitter's count?
export async function firstValues<T>(emitter: Emitter<T>, times: number) {
    let count = 0
    let ret : T[] = []
    for await (let val of emitter.all) {
        ret.push(val)
        if (++count == times)
            break
    }
    return ret
}