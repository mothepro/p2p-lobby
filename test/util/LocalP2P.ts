import P2P from '../..'

let total = 0

/** A P2P Lobby with defaults to communicate to other nodes within the same client. */
export default function createNode(): P2P<string> {
    return new P2P(
        `node-#${++total}`,
        'p2p-lobby',
        {
            repo: `ipfs/pubsub-demo/${total}`,
            Swarm: ['/ip4/127.0.0.1/tcp/0'],
            pollInterval: 50
        }
    )
}
