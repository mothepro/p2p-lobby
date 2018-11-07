import createNode from './LocalP2P'
import Events, { EventMap } from '../../src/events'

type MockP2P = ReturnType<typeof createNode>

const listeners: WeakMap<MockP2P, Map<Events, Function>> = new WeakMap

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function stopWaitingForEvent(node: MockP2P, event: Events) {
    if(listeners.has(node) && listeners.get(node)!.has(event)) { 
        (node as any).removeListener(event, listeners.get(node)!.get(event))

        listeners.get(node)!.delete(event)
        if(listeners.get(node)!.size == 0)
            listeners.delete(node)
    }
}

export async function forEvent(node: MockP2P, event: Events, times = 1) {
    return generalForEvent(node, event, {times})
}

export async function forEventWithValue<K extends Events, V extends EventMap[K]>(node: MockP2P, event: K, value: V, times = 1) {
    return generalForEvent(node, event, {times, shouldCount: arg => arg === value})
}

async function generalForEvent<K extends Events, V extends EventMap[K]>(
    node: MockP2P,
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
    
    function on(node: MockP2P, event: Events, listener: Function) {
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