import createNode from './LocalP2P'
import Events, { EventMap } from '../../src/events'

type MockP2P = ReturnType<typeof createNode>
type NodeEventPair = [MockP2P, Events]

const listeners: Map<NodeEventPair, Function> = new Map

// TODO: DRYer approach
export async function forEvent(
    node: MockP2P,
    event: Events, 
    times = 1
): Promise<EventMap[typeof event][]> {
    let resolver: Function
    let attempts = times
    const ret: EventMap[typeof event][] = []
    const pair: NodeEventPair = [node, event]

    if(listeners.has(pair)) { // Remove completed forEvent's so the overflow error isn't called.
        (node as any).removeListener(event, listeners.get(pair)!)
        listeners.delete(pair)
    }

    function waiter(arg: any) {
        ret.push(arg)

        if(--attempts == 0)
            resolver(ret)
    }

    return new Promise<any>(resolve => {
        resolver = resolve
        node.on(event, waiter)
        listeners.set(pair, waiter)
    }).then(arg => {
        node.once(event, () => { throw Error(`Event "${event}" emitted more than ${times} times on ${node}.`) })
        return arg
    })
}

export async function forEventValue(
  node: MockP2P,
  event: Events,
  value: EventMap[typeof event],
  times = 1,
): Promise<EventMap[typeof event][]> {
    let resolver: Function
    let attempts = times
    const ret: EventMap[typeof event][] = []

    function waiter(arg: any) {
        if(arg === value) {
            ret.push(arg)

            if (--attempts == 0)
                resolver(ret)
        }
    }

    return new Promise<any>(resolve => {
        resolver = resolve
        node.on(event, waiter)
    }).then(arg => {
        node.once(event, () => { throw Error(`Event "${event}" emitted more than ${times} times on ${node}.`) })
        return arg
    })
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
