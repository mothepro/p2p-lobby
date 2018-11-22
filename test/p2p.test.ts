import 'mocha'
import 'should'
import {createNode, delay, forEvent, forEventWithValue} from './util/util'
import Errors from '../src/errors'
import Events from '../src/events'
import P2P from '..'

const pollInterval = 50
let node1: P2P<string>,
    node2: P2P<string>,
    node3: P2P<string>

it('Connect & Disconnect Node', async function () {
    // this.timeout(5 * 1000) // wait longer for disconnection

    node1 = createNode()
    node1.isConnected.should.be.false()

    await node1.connect()
    node1.isConnected.should.be.true()

    await node1.disconnect()
    node1.isConnected.should.be.false()
})

describe('Basic P2P Nodes', function () {
    this.retries(2)

    beforeEach(function () {
        // this.timeout(60 * 1000)

        node1 = createNode()
        node2 = createNode()
        node3 = createNode()

        for(const node of [node1, node2, node3]) {
            // idk why these cast is needed
            (node as any).on(Events.error, (e: Error) => { throw e });
            (node as any).on(Events.disconnected, () => console.log(`${node.name} is diconnected. (${node['id']})`));
        }

        return Promise.all([
            node1.connect(),
            node2.connect(),
            node3.connect(),
        ]).then(() => console.log('All nodes connected.'))
    })

    afterEach(function () {
        // this.timeout(10 * 1000)

        // Don't print that we are remove a specific node
        node1.removeAllListeners()
        node2.removeAllListeners()
        node3.removeAllListeners()

        return Promise.all([
            node1.disconnect(),
            node2.disconnect(),
            node3.disconnect(),
        ])
        .catch(e => {}) // swallow
        .then(() => console.log('All nodes disconnected.'))
    })

    it('Should block a second connection', async () => {
        forEvent(node1, Events.error).should.be.fulfilledWith(Errors.SYNC_JOIN)

        return Promise.all([
            node1.joinLobby({pollInterval}),
            node1.joinLobby({pollInterval}),
        ]).should.rejectedWith(Errors.SYNC_JOIN)
    })

    describe('Idling', function () {
        const maxIdle = 100
        this.timeout(5 * 1000 + 2 * maxIdle)

        it('Kick me from lobby', async () => {
            await node1.joinLobby({pollInterval, maxIdle})
            node1.isConnected.should.be.true()

            await Promise.all([
                forEvent(node1, Events.disconnected),
                delay(maxIdle),
            ])
            node1.isConnected.should.be.false()
        })

        it('Leave me in group with peer', async () => {
            await Promise.all([
                node1.joinLobby({pollInterval, maxIdle}),
                node2.joinLobby({pollInterval, maxIdle}),
            ])

            await node1.joinGroup(node2['id'])
            node1.isConnected.should.be.true()

            await delay(maxIdle * 2)
            node1.isConnected.should.be.true()
        })
    })

    describe('Lobbies', function () {
        // this.timeout(20 * 1000)

        it('2 Nodes Join', async () => {
            const [[id2], [id1]] = await Promise.all([
                forEvent(node1, Events.lobbyJoin),
                forEvent(node2, Events.lobbyJoin),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
            ])

            node2['id'].should.eql(id2)
            node1['id'].should.eql(id1)
        })

        it('Many Nodes Join', async () => {
            (node1 as any).on(Events.lobbyLeft, () => {throw Error('No peers should be leaving')})

            const [node1peerIDs] = await Promise.all([
                forEvent(node1, Events.lobbyJoin, 2),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])

            node1peerIDs.should.containEql(node2['id'])
            node1peerIDs.should.containEql(node3['id'])

            const node2name = node1.getPeerName(node2['id']),
                node3name = node1.getPeerName(node3['id'])

            if (!node2name)
                throw Error('Node 2 should have a name')

            if (!node3name)
                throw Error('Node 3 should have a name')

            node2name.should.eql(node2.name)
            node3name.should.eql(node3.name)
        })

        it('Node Leaving', async function () {
            this.retries(2)
            this.timeout(20 * 1000)

            await Promise.all([
                forEvent(node1, Events.lobbyJoin, 2),
                forEvent(node2, Events.lobbyJoin, 2),
                forEvent(node3, Events.lobbyJoin, 2),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])

            await Promise.all([
                forEventWithValue(node1, Events.lobbyLeft, node3['id']),
                forEventWithValue(node2, Events.lobbyLeft, node3['id']),
                node3.disconnect(),
            ])
        })

        it.skip('Can\'t send messages in lobby', async () => {
            await node1.joinLobby({pollInterval})
            return node1.broadcast('hello world').should.rejectedWith(Errors.MUST_BE_IN_ROOM)
        })
    })

    describe('Rooms', function () {
        // this.timeout(10 * 1000) // for readying up

        // Resolves once all nodes are ready in node1's room.
        let allReady: Promise<any[]> // actually [void, void, void]

        beforeEach(function () {
            // this.timeout(120 * 1000)

            return Promise.all([
                forEvent(node1, Events.lobbyConnect),
                forEvent(node2, Events.lobbyConnect),
                forEvent(node3, Events.lobbyConnect),

                forEvent(node1, Events.lobbyJoin, 2),
                forEvent(node2, Events.lobbyJoin, 2),
                forEvent(node3, Events.lobbyJoin, 2),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])
            .then(() => console.log('All nodes are in lobby and know each other'))
            .then(() => Promise.all([
                forEvent(node1, Events.groupJoin, 2),
                forEvent(node2, Events.groupJoin, 2),
                forEvent(node3, Events.groupJoin, 2),

                node2.joinGroup(node1['id']),
                node3.joinGroup(node1['id']),
            ]))
            .catch(err => console.log('error', err))
            .then(() => {
                // Just set a broader scoped var, don't wait for anything
                allReady = Promise.all([
                    forEvent(node1, Events.groupReady),
                    forEvent(node2, Events.groupReady),
                    forEvent(node3, Events.groupReady),
                ])
                console.log('`node2` & `node3` are connected to `node1`\'s group')
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
            node1['hashGroupPeers']().should.eql(node2['hashGroupPeers']())
            node2['hashGroupPeers']().should.eql(node3['hashGroupPeers']())
        })

        it.skip('Can\'t send messages before ready', async () => {
            return node1.broadcast('hello world').should.rejectedWith(Errors.MUST_BE_IN_ROOM)
        })

        it('Send messages', async () => {
            await node1.readyUp()
            await allReady

            const [[msg1, msg2]] = await Promise.all([
                forEvent(node3, Events.data, 2),

                node2.broadcast('hello all'),
                node1.broadcast('what\'s up peers'),
            ])

            const msgs = [
                {
                    peer: node2['id'],
                    data: 'hello all',
                },
                {
                    peer: node1['id'],
                    data: 'what\'s up peers',
                }
            ]

            if(typeof msg1 == 'undefined' || typeof msg2 == 'undefined')
                throw Error('Nothing was emitted with `node3.on(Events.data, void)`')

            msg1.should.be.oneOf(msgs)
            msg2.should.be.oneOf(msgs)
        })
    })
})
