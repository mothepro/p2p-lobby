import P2P, {EventNames} from '..'
import {name as pkgName, version as pkgVersion} from '../package.json'
import {log} from './util'

const lobbyForm = document.getElementById('joinLobby')! as HTMLFormElement
const lobbyBtn  = document.getElementById('joinLobbyBtn')! as HTMLInputElement
const input     = document.getElementById('name')! as HTMLInputElement

lobbyForm.addEventListener('submit', async e => {
    e.preventDefault()
    lobbyBtn.disabled = true

    log('Creating Node')
    const node = new P2P(input.value.trim(), `my-demo-${pkgName}@${pkgVersion}`, {allowSameBrowser: true})
    node.on(EventNames.error, log)
    node.on(EventNames.peerJoin, peerID => log(`Welcome ${node.peers.get(peerID)}`))
    node.on(EventNames.peerLeft, peerID => log(`See ya ${node.peers.get(peerID)}`))

    log('Joining Lobby')
    await node.joinLobby()

    log(node.name, 'is in the lobby')
})

log('All entries are logged here')