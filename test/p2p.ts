import 'mocha'
import 'should'
import createNode, {closeNodes, EventNames} from './util/LocalP2P'
import {PeerID} from 'ipfs'
type MockP2P = ReturnType<typeof createNode>

describe('Basic P2P Nodes', function () {
    this.timeout(10 * 1000)

    afterEach(async () => await closeNodes()) // Always close leftover nodes

    it('Connect & Disconnect', async () => {
        let node = createNode()
        await node.connect()
        node.isConnected.should.be.true()
        await node.disconnect()
        node.isConnected.should.be.false()
    })

    describe('Lobbies', function () {
        this.timeout(30 * 1000)
        this.retries(2)

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
            const node1 = createNode()
            const node2 = createNode()
            const node3 = createNode()
            const node4 = createNode()

            await Promise.all([
                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
                node4.joinLobby(),
            ])

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
                        node1.peers.should.eql(new Map([
                            [node2.getID(), node2.name],
                            [node3.getID(), node3.name],
                            [node4.getID(), node4.name],
                        ]))
                        resolve()
                    }

                    if (events > 3)
                        reject(Error('The peerJoin event was called too many times.'))
                })
            })
        })

        it('Node Leaving', async () => {
            const node1 = createNode()
            const node2 = createNode()
            const node3 = createNode()

            await Promise.all([
                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),

                // wait for `node3` to join everybody
                new Promise(resolve => node1.on(EventNames.peerJoin, id => {
                    if (id == node3.getID())
                        resolve()
                })),
                new Promise(resolve => node2.on(EventNames.peerJoin, id => {
                    if (id == node3.getID())
                        resolve()
                })),
            ])

            const [, left1, left2] = await Promise.all([
                node3.disconnect(),
                new Promise(resolve => node1.once(EventNames.peerLeft, id => resolve(id))),
                new Promise(resolve => node2.once(EventNames.peerLeft, id => resolve(id))),
            ])

            left1.should.eql(node3.getID())
            left2.should.eql(node3.getID())
        })
    })

    describe('Rooms', function () {
        this.timeout(20 * 1000)
        let node1: MockP2P,
            node2: MockP2P,
            node3: MockP2P,
            allReady: Promise<void[]>

        beforeEach(async () => {
            node1 = createNode()
            node2 = createNode()
            node3 = createNode()

            await Promise.all([
                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
            ])

            // node2 sees that node1 joined and will try to connect
            const id = await new Promise<PeerID>(resolve => node2.once(EventNames.peerJoin, id => resolve(id)))

            await Promise.all([
                node2.joinPeer(id),
                node3.joinPeer(node1.getID()),

                // Wait for other peers to join node1
                // Since no event is emitted when someone joins me while in lobby
                new Promise(resolve => node2.once(EventNames.peerJoin, id => resolve(id))),
                new Promise(resolve => node3.once(EventNames.peerJoin, id => resolve(id))),
            ])

            allReady = Promise.all([
                new Promise<void>(resolve => node1.once(EventNames.roomReady, resolve)),
                new Promise<void>(resolve => node2.once(EventNames.roomReady, resolve)),
                new Promise<void>(resolve => node3.once(EventNames.roomReady, resolve)),
            ])
        })

        it('Ready up', async () => {
            await node1.readyUp()
            await allReady
        })

        it('Generate same random number', async () => {
            await node1.readyUp()
            await allReady

            // We can not directly call random since the generated seed global
            // meaning calls to next will mutate the calls by the other functions.
            node1.getHashPeerMap().should.eql(node2.getHashPeerMap())
            node2.getHashPeerMap().should.eql(node3.getHashPeerMap())
        })

        it('Send messages')

        it('Direct Joins')
    })
})
