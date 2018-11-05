import P2P, {EventNames} from '..'
import lobbyConnect from './src/lobbyConnect'
import myRoomConnect from './src/myRoomConnect'
import {name as pkgName, version as pkgVersion} from '../package.json'
import {PeerID} from 'ipfs'
import log from './src/log'
import { RandomRequest } from './src/messages'
import { htmlSafe } from './src/util';

let node: P2P<string>
const app = document.getElementById('app')! as HTMLDivElement

// Join Lobby button is pressed
const lobbyForm = document.getElementById('joinLobby')! as HTMLFormElement,
      nameInput = document.getElementById('name')! as HTMLInputElement
lobbyForm.addEventListener('submit', async e => {
    e.preventDefault()
    app.removeChild(lobbyForm)

    log('Creating Node')
    node = createNode(nameInput.value.trim())

    log('Joining Lobby')
    await node.joinLobby()

    log(htmlSafe(node.name), 'is in the lobby')
})

// Sending a message
const chatbox   = document.getElementById('chatbox')! as HTMLDivElement,
      chatForm  = document.getElementById('chatForm')! as HTMLFormElement,
      dataInput = document.getElementById('data')! as HTMLInputElement
chatForm.addEventListener('submit', async e => {
    e.preventDefault()
    log('Attempting to broadcast:', htmlSafe(dataInput.value.trim()))
    await node.broadcast(dataInput.value.trim())
    dataInput.value = ''
})

// Click Request Random Int
const randInt = document.getElementById('randInt')! as HTMLButtonElement
randInt.addEventListener('click', async () => await node.broadcast(new RandomRequest(true)))

// Click Request Random Float
const randFloat = document.getElementById('randFloat')! as HTMLButtonElement
randFloat.addEventListener('click', async () => await node.broadcast(new RandomRequest(false)))

// Click disconnect
const disconnect = document.getElementById('disconnect')! as HTMLButtonElement
disconnect.addEventListener('click', async () => await node.disconnect())

/** Creates a new P2P node binds its events */
const lc = (arg: {peer: PeerID, joined: boolean}) => lobbyConnect(node, arg),
      mc = (arg: {peer: PeerID, joined: boolean}) => myRoomConnect(node, arg)

function createNode<T extends string | { toString(): string }>(name: T): P2P<T> {
    const node = new P2P(name, `my-demo-${pkgName}@${pkgVersion}`,
        {
            allowSameBrowser: true,
            // maxIdleTime: 30 * 60 * 1000,
        })

    document.title += ` • ${name}`

    node.on(EventNames.error, log)
    node.on(EventNames.connected, () => log('Node connected'))
    node.on(EventNames.disconnected, () => {
        const myPeerList = document.getElementById('my-peers')! as HTMLUListElement
        const lobbyPeerList = document.getElementById('lobby-peers')! as HTMLUListElement
        myPeerList.innerHTML = ''
        lobbyPeerList.innerHTML = ''
        chatbox.style.display = 'none'

        log('Node disconnected')
    })
    node.on(EventNames.peerJoin, peer => log('Welcome', htmlSafe(node.peers.get(peer))))
    node.on(EventNames.peerLeft, peer => log('See ya', htmlSafe(node.peers.get(peer))))

    node.on(EventNames.lobbyChange, lc)
    node.on(EventNames.meChange, mc)

    // Show chat box and clear peer lists for new peers
    const peerList  = document.getElementById('my-peers')! as HTMLUListElement
    node.on(EventNames.roomReady, () => {
        node.removeListener(EventNames.lobbyChange, lc)
        node.removeListener(EventNames.meChange, mc)
        log('Room ready')
        
        app.removeChild(document.getElementById('lobby-peers')!)
        chatbox.style.display = 'block'

        peerList.innerHTML = ''

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-primary'
        li.innerHTML = 'List of peers connected to this room'
        peerList.appendChild(li)

        for(const [peerId, name] of node.peers) {
            const li = document.createElement('li')
            li.className = 'list-group-item'
            li.innerHTML = htmlSafe(name)
            li.id = peerId
            peerList.appendChild(li)
        }
    })

    // Incoming messages
    node.on(EventNames.data, ({peer, data}: {peer: PeerID, data: any}) => {
        const peerName = htmlSafe(node.peers.has(peer) ? node.peers.get(peer)! : node.name)

        if (data instanceof RandomRequest) {
            const rand = data.isInt ? node.randomUInt(100) : node.random()
            log(peerName, 'made the random number', rand)
        } else if (typeof data == 'string')
            log(peerName, 'says', htmlSafe(data))
        else {
            const err = Error('A peer has sent some unexpected data');
            (err as any).peerID = peer;
            (err as any).data = data;
            log(err)
        }
    })

    return node
}

log('All entries are logged here')
