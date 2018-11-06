import P2P, { EventNames } from '..'
import { name as pkgName, version as pkgVersion } from '../package.json'
import bindNode from './src/bindNode'
import log from './src/log'
import { RandomRequest } from './src/messages'
import { htmlSafe } from './src/util'
import { PeerID } from 'ipfs'

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
    document.title += ` • ${node.name}` // Makes tab hunting easier
    joinLobby()
})

// Rejoin Lobby button is pressed
const rejoinBtn = document.getElementById('rejoin')! as HTMLButtonElement
rejoinBtn.addEventListener('click', e => {
    e.preventDefault()
    rejoinBtn.style.display = 'none'
    joinLobby()
})

// Sending a message
const chatForm  = document.getElementById('chatForm')! as HTMLFormElement,
      dataInput = document.getElementById('data')! as HTMLInputElement
chatForm.addEventListener('submit', e => {
    e.preventDefault()
    log('Attempting to broadcast:', htmlSafe(dataInput.value.trim()))
    dataInput.value = ''
    node.broadcast(dataInput.value.trim())
})

// Click Request Random Int
const randInt = document.getElementById('randInt')! as HTMLButtonElement
randInt.addEventListener('click', () => node.broadcast(new RandomRequest(true)))

// Click Request Random Float
const randFloat = document.getElementById('randFloat')! as HTMLButtonElement
randFloat.addEventListener('click', () => node.broadcast(new RandomRequest(false)))

// Click disconnect
const disconnect = document.getElementById('disconnect')! as HTMLButtonElement
disconnect.addEventListener('click', () => node.disconnect())

/** Connects the node to the lobby */
async function joinLobby() {
    if (node) {
        log('Joining Lobby')
        bindNode(node)
        await node.joinLobby()
        log(htmlSafe(node.name), 'is in the lobby')
    } else
        log(Error('Node must be created before binding'))
}

log('All entries are logged here')
