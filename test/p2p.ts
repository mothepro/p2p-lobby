import 'mocha'
import 'should'
import createNode, {closeNodes, EventNames} from './util/LocalP2P'

describe('Basic P2P Nodes', function() {
  this.timeout(10000)

  after(async () => await closeNodes()) // Always close leftover nodes

  it('Connect & Disconnect', async () => {
    let node = createNode()
    await node.connect()
    node.isConnected.should.be.true()
    await node.disconnect()
    node.isConnected.should.be.false()
  })

  it('Join Lobby', async () => {
    let node1 = createNode()
    await node1.joinLobby()

    let node2 = createNode()
    await node2.joinLobby()

    const id = await new Promise(resolve => node1.once(EventNames.peerJoin, resolve))
    node2.getID().should.eql(id)
  })
})
