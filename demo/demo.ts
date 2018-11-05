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

// Create Node & Join Lobby button is pressed
const lobbyForm = document.getElementById('joinLobby')! as HTMLFormElement,
      nameInput = document.getElementById('name')! as HTMLInputElement
lobbyForm.addEventListener('submit', e => {
    e.preventDefault()
    app.removeChild(lobbyForm)

    log('Creating Node')
    node = new P2P(
        nameInput.value.trim(),
        `my-demo-${pkgName}@${pkgVersion}`,
        {
            allowSameBrowser: true,
            maxIdleTime: 30 * 60 * 1000,
        }
    )
    bindNode()
    document.title += ` • ${node.name}` // Makes tab hunting easier
    joinLobby()
})

// Rejoin Lobby button is pressed
const rejoinBtn = document.getElementById('rejoin')! as HTMLButtonElement
rejoinBtn.addEventListener('click', e => {
    e.preventDefault()
    rejoinBtn.style.display = 'none'
    bindNode()
    joinLobby()
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

/** Connects the node to the lobby */
async function joinLobby() {
    log('Joining Lobby')
    await node.joinLobby()
    log(htmlSafe(node.name), 'is in the lobby')
}

/** binds the events for the node */
const myPeerList = document.getElementById('my-peers')! as HTMLUListElement,
      lobbyPeerList = document.getElementById('lobby-peers')! as HTMLUListElement
function bindNode() {
    if (!node) {
        log(Error('Node must be created before binding'))
        return
    }

    node.on(EventNames.error, log)

    node.on(EventNames.connected, () => log('Node connected'))
    node.on(EventNames.disconnected, () => {
        myPeerList.innerHTML = ''
        lobbyPeerList.innerHTML = ''
        chatbox.style.display = 'none'
        rejoinBtn.style.display = 'block'

        log('Node disconnected')
    })

    node.on(EventNames.peerJoin, peer => log('Welcome', htmlSafe(node.peers.get(peer))))
    node.on(EventNames.peerLeft, peer => log('See ya', htmlSafe(node.peers.get(peer))))

    node.on(EventNames.lobbyChange, peerState => lobbyConnect(node, peerState))
    node.on(EventNames.meChange, peerState => myRoomConnect(node, peerState))

    // Show chat box and clear peer lists for new peers
    node.on(EventNames.roomReady, () => {
        log('Room ready')
        // We dont care about the lobby anymore, but don't remove if they join back
        lobbyPeerList.innerHTML = ''
        chatbox.style.display = 'block'

        myPeerList.innerHTML = ''

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-primary'
        li.innerHTML = 'List of peers connected to this room'
        myPeerList.appendChild(li)

        for(const [peerId, name] of node.peers) {
            const li = document.createElement('li')
            li.className = 'list-group-item'
            li.innerHTML = htmlSafe(name)
            li.id = peerId
            myPeerList.appendChild(li)
        }
    })

    // Incoming messages
    node.on(EventNames.data, ({peer, data}: {peer: PeerID, data: any}) => {
        const peerName = htmlSafe(node.peers.has(peer) ? node.peers.get(peer)! : node.name)

        if (data instanceof RandomRequest)
            log(peerName, 'made the random number', node.random(data.isInt))
        else if (typeof data == 'string')
            log(peerName, 'says', htmlSafe(data))
        else {
            const err = Error('A peer has sent some unexpected data');
            (err as any).peerID = peer;
            (err as any).data = data;
            log(err)
        }
    })
}

log('All entries are logged here')
