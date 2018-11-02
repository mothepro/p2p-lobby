import 'mocha'
import 'should'
import createNode, {EventNames, MockP2Popts} from './util/LocalP2P'
import {delay, forEvent, forEventValue} from './util/util'

type MockP2P = ReturnType<typeof createNode>

describe('Basic P2P Nodes', function () {
    this.retries(3)

    const options: Partial<MockP2Popts> = {}
    let node1: MockP2P,
        node2: MockP2P,
        node3: MockP2P,
        node4: MockP2P

    beforeEach(function () {
        this.timeout(60 * 1000)

        node1 = createNode(options)
        node2 = createNode(options)
        node3 = createNode(options)
        node4 = createNode(options)

        return Promise.all([
            node1.connect(),
            node2.connect(),
            node3.connect(),
            node4.connect(),
        ]).then(() => console.log('All nodes connected.'))
    })

    afterEach(function () {
        this.timeout(10 * 1000)
        return Promise.all([
            node1.disconnect(),
            node2.disconnect(),
            node3.disconnect(),
            node4.disconnect(),
        ]).then(() => console.log('All nodes disconnected.'))
    })

    it('Connect & Disconnect', async function () {
        this.timeout(5 * 1000) // wait longer for disconnection

        await node1.connect()
        node1.isConnected.should.be.true()
        await node1.disconnect()
        node1.isConnected.should.be.false()
    })

    describe('Idling', function () {
        const IDLE_TIME = 100
        options.maxIdleTime = IDLE_TIME

        it('Kick me from lobby', async () => {
            node1.joinLobby()
            node1.isConnected.should.be.true()
            await delay(IDLE_TIME)
            node1.isConnected.should.be.false()
        })

        it('Leave me with peer', async () => {
            node1.joinPeer(node2.getID())
            node1.isConnected.should.be.true()
            await delay(IDLE_TIME)
            node1.isConnected.should.be.true()
        })
    })

    describe('Lobbies', function () {
        it('2 Nodes Join', async () => {
            await node1.joinLobby()
            await node2.joinLobby()

            const [id2, id1] = await Promise.all([
                forEvent(node1, EventNames.peerJoin),
                forEvent(node2, EventNames.peerJoin),
            ])
            node2.getID().should.eql(id2)
            node1.getID().should.eql(id1)
        })

        it('Many Nodes Join', async () => {
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

        // It seems that ipfs.peers doesn't always update when someone leaves.
        it.skip('Node Leaving', async function () {
            this.timeout(5 * 1000) // wait longer for disconnection

            await Promise.all([
                forEvent(node1, EventNames.peerJoin, 2),
                forEvent(node2, EventNames.peerJoin, 2),
                forEvent(node3, EventNames.peerJoin, 2),

                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
            ])

            await Promise.all([
                forEventValue(node1, EventNames.peerLeft, node3.getID()),
                forEventValue(node2, EventNames.peerLeft, node3.getID()),
                node3.disconnect(),
            ])
        })
    })

    describe('Rooms', function () {
        this.timeout(10 * 1000) // for readying up

        // Resolves once all nodes are ready in node1's room.
        let allReady: Promise<void[]>

        beforeEach(function () {
            this.timeout(30 * 1000)

            return Promise.all([
                forEvent(node1, EventNames.peerJoin, 2),

                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
            ])
            .then(() => console.log('Nodes are in Lobby'))
            .then(() => Promise.all([
                // Wait for other peers to join node1
                // Since no event is emitted when someone joins me while in lobby
                forEvent(node2, EventNames.peerJoin),
                forEvent(node3, EventNames.peerJoin, 2),

                node2.joinPeer(node1.getID()),
                node3.joinPeer(node1.getID()),
            ]))
            .then(() => {
                // Just set a broader scoped var, don't wait for anything
                allReady = Promise.all([
                    forEvent(node1, EventNames.roomReady),
                    forEvent(node2, EventNames.roomReady),
                    forEvent(node3, EventNames.roomReady),
                ])
                console.log('`node2` & `node3` are connected to `node1`\'s room')
            })
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
