import P2P from '../..'
import {PeerID} from 'ipfs'
import log from './log'
import { htmlSafe } from './util'
import { hasPeers } from './myRoomConnect'

const peerList = document.getElementById('lobby-peers')! as HTMLUListElement

/** This is triggered when someone joines the lobby */
export default function lobbyConnect(
    node: P2P<any>,
    {peer, joined}: {peer: PeerID, joined: boolean},
) {
    const peerName = htmlSafe(node.peers.get(peer)!)

    if (joined) {
        log('Welcome to the lobby ', peerName)

        if (peerList.childNodes.length == 0) { // Add title
            const li = document.createElement('li')
            li.className = 'list-group-item list-group-item-primary d-flex justify-content-between'
            li.innerHTML = 'Peers in the lobby'
            peerList.appendChild(li)
        }

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-action d-flex align-items-center justify-content-between'
        li.innerHTML = peerName
        li.id = `lobby-${peer}`

        if (node.isLobby && !hasPeers()) {
            const joinBtn = document.createElement('button')
            joinBtn.className = 'btn btn-outline-secondary joinBtn'
            joinBtn.innerHTML = 'Join'
            joinBtn.addEventListener('click', async () => {
                log('Attempting to join', peerName)
                joinBtn.disabled = true
                await node.joinPeer(peer)
                peerList.innerHTML = '' // we don't know about the lobby anymore
                log(`Now waiting in ${peerName}'s room`)
            })

            li.appendChild(joinBtn)
        }
        peerList.appendChild(li)
    } else {
        log(peerName, 'has left the lobby')
        peerList.removeChild(document.getElementById(`lobby-${peer}`)!)

        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0])
    }
}
