import createNode, {EventNames} from './LocalP2P'
import {Events} from '../../src/P2P'

type MockP2P = ReturnType<typeof createNode>
type NodeEventPair = [MockP2P, EventNames]

const listeners: Map<NodeEventPair, Function> = new Map

// TODO: DRYer approach
export async function forEvent(
    node: MockP2P,
    event: EventNames, 
    times = 1
): Promise<Events[typeof event][]> {
    let resolver: Function
    let attempts = times
    const ret: Events[typeof event][] = []
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
  event: EventNames,
  value: Events[typeof event],
  times = 1,
): Promise<Events[typeof event][]> {
    let resolver: Function
    let attempts = times
    const ret: Events[typeof event][] = []

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
