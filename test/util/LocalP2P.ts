import {PeerID} from 'ipfs'
import P2P, {EventNames} from '../..'
export {EventNames}

const RUN_TIME = Date.now()
let total = 0
let peers: Set<MockP2P> = new Set

// Remove default bind to the `beforeunload` event
interface Global {
  addEventListener: Function
}
declare const global: Global
global.addEventListener = () => {}

/** Close all peers at end instead. */
export async function closeNodes() {
  console.log(`Closing connections for ${peers.size} nodes.`)
  await Promise.all([...peers].map(peer => peer.disconnect()))
  peers.clear()
}

/** A more open P2P impl for node. */
class MockP2P extends P2P<string> {
  constructor(name: string) {
      super(
          name,
          'p2p-lobby-local',
          {
              repo: `test-data/${RUN_TIME}/${total}`,
              Swarm: ['/ip4/127.0.0.1/tcp/0'],
              pollInterval: 1000 + (100 * total)
          }
      )
  }

  public getID(): PeerID {
      return this.id
  }

  public toString() {
      return `Node "${this.name}" (${this.id})`
  }
}

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export default function createNode(name = `node-#${++total}`): MockP2P {
    let p2p = new MockP2P(name)
    p2p.on(EventNames.error, (e: Error) => {throw e})
    peers.add(p2p)
    return p2p
}
