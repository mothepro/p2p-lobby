import P2P, {EventNames} from '..'
import {name as pkgName, version as pkgVersion} from '../package.json'
import {log} from './util'

const lobbyBtn = document.getElementById('joinLobby')! as HTMLButtonElement

lobbyBtn.addEventListener('click', async e => {
    const input = document.getElementById('name')! as HTMLInputElement
    if(input.value.trim().length >= 2)
        return

    lobbyBtn.disabled = true

    log('Creating Node')
    const node = new P2P(input.value.trim(), `my-demo-${pkgName}@${pkgVersion}`)
    node.on(EventNames.error, log)
    node.on(EventNames.peerJoin, peerID => log(`Welcome ${node.peers.get(peerID)}`))
    node.on(EventNames.peerLeft, peerID => log(`See ya ${node.peers.get(peerID)}`))

    log('Joining Lobby')
    await node.joinLobby()

    log(`In lobby [${node.name}]`)
})

log('All entries are logged here')