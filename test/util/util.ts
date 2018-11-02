import createNode, {EventNames} from './LocalP2P'

type MockP2P = ReturnType<typeof createNode>

// TODO: replace with events from P2P.ts
interface Events {
    [EventNames.error]: Error
    [EventNames.peerJoin]: string
    [EventNames.peerLeft]: string
    [EventNames.peerChange]: string
    [EventNames.data]: any
    [EventNames.roomReady]: void
}

// TODO: DRYer approach
export async function forEvent(node: MockP2P, event: EventNames, times = 1): Promise<Events[typeof event]> {
    let resolver: Function

    function waiter(arg: any) {
        if(--times == 0)
            resolver(arg)
    }

    return new Promise(resolve => {
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
): Promise<Events[typeof event]> {
    let resolver: Function
console.log(`${node.getID()}.on(${event}, ${value}) x ${times}`)
    function waiter(arg: any) {
console.log(`${node.getID()}.emit(${event}, ${arg}) ... ${arg === value} & ${times} == 1`)
        if(arg === value && --times == 0)
            resolver(arg)
    }

    return new Promise(resolve => {
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
