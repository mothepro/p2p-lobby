import createNode, {EventNames} from './LocalP2P'
import {Events} from '../../src/P2P'

type MockP2P = ReturnType<typeof createNode>

// TODO: DRYer approach
export async function forEvent(
    node: MockP2P,
    event: EventNames, 
    times = 1
): Promise<Events[typeof event][]> {
    let resolver: Function
    const ret: Events[typeof event][] = []

    function waiter(arg: any) {
        ret.push(arg)

        if(--times == 0)
            resolver(ret)
    }

    return new Promise<any>(resolve => {
        resolver = resolve
        node.on(event, waiter)
    }).then(arg => {
        node.removeListener(event, waiter)
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
    const ret: Events[typeof event][] = []

    function waiter(arg: any) {
        if(arg === value) {
            ret.push(arg)

            if (--times == 0)
                resolver(ret)
        }
    }

    return new Promise<any>(resolve => {
        resolver = resolve
        node.on(event, waiter)
    }).then(arg => {
        node.removeListener(event, waiter)
        return arg
    })
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
