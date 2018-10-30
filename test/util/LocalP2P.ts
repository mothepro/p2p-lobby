import {PeerID} from 'ipfs'
export {EventNames} from '../..'
import P2P from '../..'

const RUN_TIME = Date.now()
let total = 0
let peers: Set<MockP2P> = new Set

// Remove default bind to the `beforeunload` event
interface Global {
  addEventListener: Function
}
declare const global: Global
global.addEventListener = () => {}

// Close all peers at end instead
export async function closeNodes() {
  console.log(`Closing connections for ${peers.size} nodes.`)
  await Promise.all([...peers].map(peer => peer.disconnect().catch(err => console.log('~~~~F', err)))).catch(err => console.log('~~~~f', err))
  peers.clear()
}

class MockP2P extends P2P<string> {
  constructor() {
      super(
          `node-#${++total}`,
          'p2p-lobby-local',
          {
              repo: `test-data/${RUN_TIME}/${total}`,
              Swarm: ['/ip4/127.0.0.1/tcp/0'],
              pollInterval: 50
          }
      )
  }

  public getID(): PeerID {
    return this.id
  }
}

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export default function createNode(): MockP2P {
    let p2p = new MockP2P
    peers.add(p2p)
    return p2p
}
