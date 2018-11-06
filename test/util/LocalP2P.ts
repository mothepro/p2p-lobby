import {PeerID} from 'ipfs'
import P2P, {Events} from '../..'
import {P2Popts} from '../../src/P2P'

const RUN_TIME = Date.now()
let total = 0
let peers: Set<MockP2P> = new Set

// Remove default bind to the `beforeunload` event
interface Global {
  addEventListener: Function
}
declare const global: Global
global.addEventListener = () => {}

export interface MockP2Popts extends P2Popts{
    name: string
    pkg: string
}

/** A more open P2P impl for node. */
class MockP2P extends P2P<string> {
    constructor({
      name = `node-#${++total}`,
      pkg = 'p2p-lobby-local',
      repo = `test-data/${RUN_TIME}/${total}`,
      Swarm = ['/ip4/127.0.0.1/tcp/0'],
      pollInterval = 50,
      maxIdleTime = 0,
    }: Partial<MockP2Popts> = {}) {
        super(name, pkg, {repo, Swarm, pollInterval, maxIdleTime})
    }

    public getID(): PeerID {
        return this['id']
    }

    public getHashPeerMap(): number {
        return this['hashPeerMap']()
    }

    public toString() {
        return `Node "${this.name}" (${this.getID()})`
    }
}

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export default function createNode(args?: Partial<P2Popts>): MockP2P {
    const node = new MockP2P(args)
    node.on(Events.error, (e: Error) => {throw e})
    peers.add(node)
    return node
}
