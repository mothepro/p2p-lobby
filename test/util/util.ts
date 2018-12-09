import Events, {EventMap} from '../../src/events'
import P2P from '../..'

const listeners: WeakMap<P2P, Map<Events, Function>> = new WeakMap
const RUN_TIME = Date.now()
let total = 0

/** Make a P2P Lobby with defaults to communicate to other nodes within the same client. */
export const createNode = () =>
    new P2P(`node-#${++total}`,'p2p-lobby-local', {
        repo: `test-data/${RUN_TIME}/${total}`,
        Swarm: ['/ip4/127.0.0.1/tcp/0'],
    })

/** Wait for some time */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Wait for the `event` to be emitted `times` times on `node` */
export const forEvent = async (node: P2P, event: Events, times = 1) =>
    generalForEvent(node, event, {times})

/** Wait for the `event` to be emitted `times` times with the value `value` on `node` */
export const forEventWithValue = async <K extends Events, V extends EventMap[K]>
    (node: P2P, event: K, value: V, times = 1) =>
        generalForEvent(node, event, {times, shouldCount: arg => arg == value})

export function stopWaitingForEvent(node: P2P, event: Events) {
    if(listeners.has(node) && listeners.get(node)!.has(event)) {
        (node as any).removeListener(event, listeners.get(node)!.get(event))

        listeners.get(node)!.delete(event)
        if(listeners.get(node)!.size == 0)
            listeners.delete(node)
    }
}

async function generalForEvent<K extends Events, V extends EventMap[K]>(
    node: P2P,
    event: K,
    {
        times = 1,
        exactly = false, // remember to clear afterwards if you want to listen over the event
        shouldCount = (arg: V) => true,
    } = {},
): Promise<V[]> {
    let resolver: Function
    let attempts = times
    const ret: V[] = []

    function on(node: P2P, event: Events, listener: Function) {
        // remove left over listener
        if(listeners.has(node) && listeners.get(node)!.has(event))
        stopWaitingForEvent(node, event)

        if(!listeners.has(node))
            listeners.set(node, new Map)
        listeners.get(node)!.set(event, listener)
    }

    function waiter(arg: any) {
        if(shouldCount(arg)) {
            ret.push(arg)

            if(--attempts == 0)
                resolver(ret)
        }
    }

    // Remove completed forEvent's so the overflow error isn't called.
    stopWaitingForEvent(node, event)

    return new Promise<any>(resolve => {
        resolver = resolve;

        (node as any).on(event, waiter)
        on(node, event, waiter)
    }).then(arg => {
        stopWaitingForEvent(node, event);

        if (exactly) {
            const overflow = () => { throw Error(`Event "${event}" emitted more than ${times} times on ${node}.`) }
            (node as any).once(event, overflow)
            on(node, event, overflow)
        }

        return arg
    })
}
