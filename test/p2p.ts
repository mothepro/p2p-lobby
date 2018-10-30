import 'mocha'
import 'should'
import createNode, {closeNodes, EventNames} from './util/LocalP2P'

describe('Basic P2P Nodes', function() {
  this.timeout(10000)

  after(async () => await closeNodes())

  it('Connect & Disconnect', async () => {
    let node = createNode()
    await node.connect()
    node.isConnected.should.be.true()
    await node.disconnect()
    node.isConnected.should.be.false()
  })
})
