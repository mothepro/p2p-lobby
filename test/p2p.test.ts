import 'should'
import {createNode, delay, firstValues} from './util'
import Errors from '../src/errors'
import P2P from '../src/P2P'

const pollInterval = 50
let node1: P2P,
    node2: P2P,
    node3: P2P

function assertLastError(message: Errors, node: P2P) {
    node.error.previous.should.resolvedWith(Error(message))
}

it('Connect & Disconnect Node', async function () {
    // this.timeout(5 * 1000) // wait longer for disconnection

    node1 = createNode()
    node1.isConnected.should.be.false()

    await node1.connect()
    node1.isConnected.should.be.true()

    await node1.disconnect()
    node1.isConnected.should.be.false()
    node1.error.count.should.eql(0)
})

describe('Basic P2P Nodes', function () {
    this.retries(2)

    beforeEach(async function() {
        // this.timeout(60 * 1000)

        node1 = createNode()
        node2 = createNode()
        node3 = createNode()

        for(const node of [node1, node2, node3])
            node.disconnected.onContinueAfterError(
                () => console.log(`${node.name} is diconnected. (${node['id']})`),
                (e: Error) => { throw e })

        await node1.connect()
        await node2.connect()
        await node3.connect()
        console.log('All nodes connected.')
    })

    afterEach(async function() {
        // this.timeout(10 * 1000)

        await node1.disconnect()
        await node2.disconnect()
        await node3.disconnect()
        console.log('All nodes disconnected.')
    })

    it('Should block a second connection', async () => {
        await Promise.race([
            node1.joinLobby({pollInterval}),
            node1.joinLobby({pollInterval}),
        ])
        assertLastError(Errors.SYNC_JOIN, node1)
    })

    describe('Idling', function () {
        const maxIdle = 100
        this.timeout(5 * 1000 + 2 * maxIdle)

        it('Kick me from lobby', async () => {
            await node1.joinLobby({pollInterval, maxIdle})
            node1.isConnected.should.be.true()
            const willDisconnect = node1.disconnected.next

            await delay(maxIdle)
            willDisconnect.should.be.fulfilled()
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
            const [id2, id1] = await Promise.all([
                node1.lobbyJoin.next,
                node2.lobbyJoin.next,

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
            ])

            node2['id'].should.eql(id2)
            node1['id'].should.eql(id1)
        })

        it('Many Nodes Join', async () => {
            await Promise.all([
                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])
            node1.lobbyConnect.count.should.eql(1)

            const others = await firstValues(node1.lobbyJoin, 2)
            others.should.containEql(node2['id'])
            others.should.containEql(node3['id'])
            node1.lobbyJoin.count.should.eql(2)

            const node2name = node1.getPeerName(node2['id']),
                node3name = node1.getPeerName(node3['id'])

            if (!node2name)
                throw Error('Node 2 should have a name')

            if (!node3name)
                throw Error('Node 3 should have a name')

            node2name.should.eql(node2.name)
            node3name.should.eql(node3.name)
            node1.lobbyLeft.count.should.eql(0)
        })

        it('Node Leaving', async function () {
            this.retries(2)
            this.timeout(20 * 1000)

            await Promise.all([
                firstValues(node1.lobbyJoin, 2),
                firstValues(node2.lobbyJoin, 2),
                firstValues(node3.lobbyJoin, 2),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])

            node1.lobbyJoin.count.should.eql(2)
            node2.lobbyJoin.count.should.eql(2)
            node3.lobbyJoin.count.should.eql(2)

            const [n1leaver, n2leaver] = await Promise.all([
                node1.lobbyLeft.next,
                node2.lobbyLeft.next,

                node3.disconnect(),
            ])

            n1leaver.should.eql(n2leaver)
            n2leaver.should.eql(node3['id'])
        })

        it.skip('Can\'t send messages in lobby', async () => {
            await node1.joinLobby({pollInterval})
            return node1.broadcast('hello world').should.rejectedWith(Errors.MUST_BE_IN_ROOM)
        })
    })

    describe('Rooms', function () {
        // this.timeout(10 * 1000) // for readying up

        // Resolves once all nodes are ready in node1's room.
        let allReady: Promise<[void, void, void]>

        beforeEach(async function () {
            // this.timeout(120 * 1000)

            await Promise.all([
                node1.lobbyConnect.next,
                node2.lobbyConnect.next,
                node3.lobbyConnect.next,
                
                firstValues(node1.lobbyJoin, 2),
                firstValues(node2.lobbyJoin, 2),
                firstValues(node3.lobbyJoin, 2),

                node1.joinLobby({pollInterval}),
                node2.joinLobby({pollInterval}),
                node3.joinLobby({pollInterval}),
            ])
            console.log('All nodes are in lobby and know each other')

            await Promise.all([
                firstValues(node1.groupJoin, 2),
                firstValues(node2.groupJoin, 2),
                firstValues(node3.groupJoin, 2),

                node2.joinGroup(node1['id']),
                node3.joinGroup(node1['id']),
            ])
            console.log('`node2` & `node3` are connected to `node1`\'s group')

            // Just set a broader scoped var, don't wait for anything
            allReady = Promise.all([
                node1.groupReady.next,
                node2.groupReady.next,
                node3.groupReady.next,
            ])
        })

        it('Ready up', async () => {
            await node1.readyUp()
            await allReady
        })

        it('Ready up with info', async () => {
            // Here we can not use a complex value since it has a different reference when unpacked
            const info = 'hello world'

            const [one, two, three] = await Promise.all([
                node1.groupReadyInit.next,
                node2.groupReadyInit.next,
                node3.groupReadyInit.next,

                node1.readyUp(info),
            ])

            one.should.eql(info)
            two.should.eql(info)
            three.should.eql(info)
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

            await Promise.all([
                node2.broadcast('hello all'),
                node1.broadcast('what\'s up peers'),
            ])
            
            for (const { peer, data } of await firstValues(node3.data, 2)) {
                peer.should.be.oneOf(node1['id'], node2['id'])
                data.should.be.oneOf('hello all', 'what\'s up peers')
            }
            node3.data.count.should.eql(2)
        })
    })
})
