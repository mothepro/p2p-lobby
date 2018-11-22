import P2P from '../..'

const RUN_TIME = Date.now()
let total = 0
let peers: Set<P2P<string>> = new Set

// Remove default bind to the `beforeunload` event
declare const global: NodeJS.Global & { addEventListener: Function }
global.addEventListener = () => {}

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export default function createNode({
       repo = `test-data/${RUN_TIME}/${total}`,
       Swarm = ['/ip4/127.0.0.1/tcp/0'],
       pollInterval = 50,
       maxIdleTime = 0,
   } = {}) {
    const node = new P2P(`node-#${++total}`, 'p2p-lobby-local', {repo, Swarm, pollInterval, maxIdleTime})
    peers.add(node)
    return node
}
