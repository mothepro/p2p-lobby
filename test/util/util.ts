import Events, {EventMap} from '../../src/events'
import P2P from '../..'

const listeners: WeakMap<P2P<string>, Map<Events, Function>> = new WeakMap
const RUN_TIME = Date.now()
let total = 0

// Remove default bind to the `beforeunload` event
declare const global: NodeJS.Global & { addEventListener: Function }
global.addEventListener = () => {}

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export const createNode = () =>
    new P2P(`node-#${++total}`,'p2p-lobby-local', {
        repo: `test-data/${RUN_TIME}/${total}`,
        Swarm: ['/ip4/127.0.0.1/tcp/0'],
    })

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function stopWaitingForEvent(node: P2P<string>, event: Events) {
    if(listeners.has(node) && listeners.get(node)!.has(event)) {
        (node as any).removeListener(event, listeners.get(node)!.get(event))

        listeners.get(node)!.delete(event)
        if(listeners.get(node)!.size == 0)
            listeners.delete(node)
    }
}

export async function forEvent(node: P2P<string>, event: Events, times = 1) {
    return generalForEvent(node, event, {times})
}

export async function forEventWithValue<K extends Events, V extends EventMap[K]>(
    node: P2P<string>,
    event: K,
    value: V,
    times = 1,
) {
    return generalForEvent(node, event, {times, shouldCount: arg => arg === value})
}

async function generalForEvent<K extends Events, V extends EventMap[K]>(
    node: P2P<string>,
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

    function on(node: P2P<string>, event: Events, listener: Function) {
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
