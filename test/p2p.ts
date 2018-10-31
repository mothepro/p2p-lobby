import 'mocha'
import 'should'
import createNode, {closeNodes, EventNames} from './util/LocalP2P'

describe('Basic P2P Nodes', function() {
    this.timeout(5 * 1000)

    afterEach(async () => await closeNodes()) // Always close leftover nodes

    it('Connect & Disconnect', async () => {
        let node = createNode()
        await node.connect()
        node.isConnected.should.be.true()
        await node.disconnect()
        node.isConnected.should.be.false()
    })

    describe('Lobbies', function() {
        this.timeout(20 * 1000)

        it('2 Nodes Join', async () => {
            let node1 = createNode()
            await node1.joinLobby()

            let node2 = createNode()
            await node2.joinLobby()

            const [id2, id1] = await Promise.all([
                new Promise(resolve => node1.once(EventNames.peerJoin, resolve)),
                new Promise(resolve => node2.once(EventNames.peerJoin, resolve)),
            ])
            node2.getID().should.eql(id2)
            node1.getID().should.eql(id1)
        })

        it('Many Nodes Join', async () => {
            let node1 = createNode()
            let node2 = createNode()
            let node3 = createNode()
            let node4 = createNode()

            await node1.joinLobby()
            await node2.joinLobby()
            await node3.joinLobby()
            await node4.joinLobby()

            let otherIDs = [node2.getID(), node3.getID(), node4.getID()]

            return new Promise((resolve, reject) => {
                let events = 0

                node1.on(EventNames.peerLeft, () => reject(Error('No peers should be leaving')))

                node1.on(EventNames.peerJoin, peer => {
                    events++

                    peer.should.be.oneOf(otherIDs)
                    otherIDs = otherIDs.filter(id => id != peer)

                    if (events == 3) {
                        otherIDs.should.be.empty()
                        resolve()
                    }

                    if (events > 3)
                        reject(Error('The peerJoin event was called too many times.'))
                })
            })
        })
    })
})
