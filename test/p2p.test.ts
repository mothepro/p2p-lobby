import 'mocha'
import 'should'
import createNode, { MockP2Popts } from './util/LocalP2P'
import { delay, forEvent, forEventWithValue } from './util/util'
import { Errors, Events } from '..'

type MockP2P = ReturnType<typeof createNode>

const options: Partial<MockP2Popts> = {}
let node1: MockP2P,
    node2: MockP2P,
    node3: MockP2P

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
    
        node1 = createNode(options)
        node2 = createNode(options)
        node3 = createNode(options)
    
        for(const node of [node1, node2, node3]) {
            node.on(Events.disconnected, () => console.log(`${node.name} is diconnected. (${node.getID()})`))
            node.on(Events.error, (e: Error) => { throw e })
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
            node1.joinLobby(),
            node1.joinLobby(),
        ]).should.rejectedWith(Errors.SYNC_JOIN)
    })

    describe('Idling', function () {
        // this.timeout(5 * 1000)

        const IDLE_TIME = 100
        this.beforeAll(() => options.maxIdleTime = IDLE_TIME)
        this.afterAll(() => delete options.maxIdleTime)

        it('Kick me from lobby', async () => {
            await node1.joinLobby()
            node1.isConnected.should.be.true()

            await Promise.all([
                forEvent(node1, Events.disconnected),
                delay(IDLE_TIME),
            ])
            node1.isConnected.should.be.false()
        })

        it('Leave me with peer', async () => {
            await node1.joinPeer(node2.getID())
            node1.isConnected.should.be.true()
            await delay(IDLE_TIME * 2)
            node1.isConnected.should.be.true()
        })
    })

    describe('Lobbies', function () {
        // this.timeout(20 * 1000)

        it('2 Nodes Join', async () => {
            const [[id2], [id1]] = await Promise.all([
                forEvent(node1, Events.peerJoin),
                forEvent(node2, Events.peerJoin),

                node1.joinLobby(),
                node2.joinLobby(),
            ])

            node2.getID().should.eql(id2)
            node1.getID().should.eql(id1)
        })

        it('Many Nodes Join', async () => {
            node1.on(Events.peerLeft, () => {throw Error('No peers should be leaving')})

            const [node1peerIDs] = await Promise.all([
                forEvent(node1, Events.peerJoin, 2),

                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
            ])

            node1peerIDs.should.containEql(node2.getID())
            node1peerIDs.should.containEql(node3.getID())
             
            node1.peers.should.eql(new Map([
                [node2.getID(), node2.name],
                [node3.getID(), node3.name],
            ]))
        })

        it('Node Leaving', async function () {
            this.retries(2)
            this.timeout(20 * 1000)

            await Promise.all([
                forEvent(node1, Events.peerJoin, 2),
                forEvent(node2, Events.peerJoin, 2),
                forEvent(node3, Events.peerJoin, 2),

                node1.joinLobby(),
                node2.joinLobby(),
                node3.joinLobby(),
            ])

            await Promise.all([
                forEventWithValue(node1, Events.lobbyLeft, node3.getID()),
                forEventWithValue(node2, Events.lobbyLeft, node3.getID()),
                node3.disconnect(),
            ])
        })

        it('Can\'t send messages in lobby', async () => {
            await node1.joinLobby()
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
                forEvent(node1, Events.lobbyJoin),
                forEvent(node2, Events.lobbyJoin),

                node1.joinLobby(),
                node2.joinLobby(),
            ])
            .then(() => console.log('2 Nodes are in Lobby'))
            .then(() => Promise.all([
                forEvent(node1, Events.meJoin, 2),   // Wait for other peers to join node1
                forEvent(node2, Events.peerJoin, 2), // All peers need to know each other
                forEvent(node3, Events.peerJoin, 2),

                node2.joinPeer(node1.getID()),
                node3.joinPeer(node1.getID()), // join directly
            ]))
            .catch(err => console.log('error', err))
            .then(() => {
                // Just set a broader scoped var, don't wait for anything
                allReady = Promise.all([
                    forEvent(node1, Events.roomReady),
                    forEvent(node2, Events.roomReady),
                    forEvent(node3, Events.roomReady),
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

        it('Can\'t send messages before ready', async () => {
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
                    peer: node2.getID(),
                    data: 'hello all',
                },
                {
                    peer: node1.getID(),
                    data: 'what\'s up peers',
                }
            ]

            if(typeof msg1 == 'undefined' || typeof msg2 == 'undefined')
                throw Error('Nothing was emitted with `node3.on(Events.data, void)`')

            msg1.should.be.oneOf(msgs)
            msg2.should.be.oneOf(msgs)
        })

        it('kick all peers out when host leaves', async () => {
            await node1.readyUp()
            await allReady

            node1.isHost.should.be.true()
            node2.isRoomReady.should.be.true()
            node2.isLobby.should.be.false()

            await Promise.all([
                forEvent(node2, Events.lobbyConnect),
                node1.disconnect(),
            ])

            node1.isHost.should.be.false()
            node2.isRoomReady.should.be.false()
            node2.isLobby.should.be.true()
        })
    })
})
