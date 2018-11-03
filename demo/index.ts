import P2P, {EventNames} from '..'
import {name as pkgName, version as pkgVersion} from '../package.json'
import {log} from './util'
import {PeerID} from 'ipfs'

let node: P2P<string>
const app       = document.getElementById('app')! as HTMLDivElement,
      lobbyForm = document.getElementById('joinLobby')! as HTMLFormElement,
      input     = document.getElementById('name')! as HTMLInputElement,
      peerList  = document.getElementById('peers')! as HTMLUListElement

function welcome(peer: PeerID) {
    const peerName = node.peers.get(peer)!
    log(`Welcome the lobby ${peerName}`)

    const li = document.createElement('li')
    li.className = 'list-group-item list-group-item-action'
    li.innerHTML = peerName
    li.addEventListener('click', async () => {
        if (!li.className.includes('disabled')) {
            log('Attempting to join', peerName)
            li.className += ' disabled'

            await node.joinPeer(peer)
            log('Now waiting in ', peerName, '\'s room')
        }
    })

    peerList.appendChild(li)
}

function escort(peer: PeerID) {
    log(`See ya ${node.peers.get(peer)}`)
    peerList.removeChild(document.getElementById(`peer-${peer}`)!)
}

lobbyForm.addEventListener('submit', async e => {
    e.preventDefault()
    app.removeChild(lobbyForm)

    log('Creating Node')
    node = new P2P(
        input.value.trim(),
        `my-demo-${pkgName}@${pkgVersion}`,
        {
            allowSameBrowser: true,
            maxIdleTime: 30 * 60 * 1000,
        })
    node.on(EventNames.error, log)
    node.on(EventNames.lobbyJoin, welcome)
    node.on(EventNames.lobbyLeft, escort)
    node.on(EventNames.connected, () => log('Node connected'))
    node.on(EventNames.disconnected, () => log('Node disconnected'))

    log('Joining Lobby')
    await node.joinLobby()

    log(node.name, 'is in the lobby')
})

log('All entries are logged here')