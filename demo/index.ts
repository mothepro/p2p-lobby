import P2P, {EventNames} from '..'
import lobbyConnect from './src/lobbyConnect'
import myRoomConnect from './src/myRoomConnect'
import {name as pkgName, version as pkgVersion} from '../package.json'
import {PeerID} from 'ipfs'
import log from './src/log'
import { RandomRequest } from './src/messages'

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

    log(node.name, 'is in the lobby')
})

// Sending a message
const chatbox   = document.getElementById('chatbox')! as HTMLDivElement,
      chatForm  = document.getElementById('chatForm')! as HTMLFormElement,
      dataInput = document.getElementById('data')! as HTMLInputElement
chatForm.addEventListener('submit', async e => {
    e.preventDefault()
    log(`attempting to broadcast "${dataInput.value.trim()}"`)
    await node.broadcast(dataInput.value.trim())
})

// Click Request Random Int
const randInt   = document.getElementById('randInt')! as HTMLButtonElement
randInt.addEventListener('click', async e => await node.broadcast(new RandomRequest(true)))

// Click Request Random Float
const randFloat = document.getElementById('randFloat')! as HTMLButtonElement
randFloat.addEventListener('click', async e => await node.broadcast(new RandomRequest(false)))

// Click disconnect
const disconnect= document.getElementById('disconnect')! as HTMLButtonElement
disconnect.addEventListener('click', async e => {
    log('Node disconnecting')
    await node.disconnect()
})

/** Creates a new P2P node binds its events */
function createNode<T>(name: T): P2P<T> {
    const node = new P2P(name, `my-demo-${pkgName}@${pkgVersion}`,
        {
            allowSameBrowser: true,
            maxIdleTime: 30 * 60 * 1000,
        })

    node.on(EventNames.error, log)
    node.on(EventNames.connected, () => log('Node connected'))
    node.on(EventNames.disconnected, () => log('Node disconnected'))
    node.on(EventNames.peerJoin, peer => log('Welcome', node.peers.get(peer)))
    node.on(EventNames.peerLeft, peer => log('See ya', node.peers.get(peer)))

    node.on(EventNames.lobbyChange, arg => lobbyConnect(node, arg))
    node.on(EventNames.meChange, arg => myRoomConnect(node, arg))

    // Show chat box and clear peer lists for new peers
    node.on(EventNames.roomReady, () => {
        const peerList  = document.getElementById('my-peers')! as HTMLUListElement
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
            li.innerHTML = name.toString()
            li.id = peerId
            peerList.appendChild(li)
        }
    })

    // Incoming messages
    node.on(EventNames.data, ({peer, data}: {peer: PeerID, data: any}) => {
        const peerName = node.peers.has(peer) ? node.peers.get(peer)! : node.name

        if (data instanceof RandomRequest) {
            const rand = data.isInt ? node.randomUInt(100) : node.random()
            log(peerName, 'requested to generate the randome number', rand)
        } else
            log(peerName, 'says', data)
    })

    return node
}

log('All entries are logged here')