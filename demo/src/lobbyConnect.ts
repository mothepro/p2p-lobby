import P2P from '../..'
import {PeerID} from 'ipfs'
import log from './log'

const peerList = document.getElementById('lobby-peers')! as HTMLUListElement

/** This is triggered when someone joines the lobby */
export default function lobbyConnect(
    node: P2P<any>,
    {peer, joined}: {peer: PeerID, joined: boolean},
) {
    const peerName = node.peers.get(peer)!

    if (joined) {
        log('Welcome to the lobby ', peerName)

        if (peerList.childNodes.length == 0) { // Add title
            const li = document.createElement('li')
            li.className = 'list-group-item list-group-item-primary'
            li.innerHTML = `List of peers connected to the Lobby<br>
            Click on a name to join their room`
            peerList.appendChild(li)
        }

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-action'
        li.innerHTML = peerName
        li.id = `lobby-${peer}`
        li.addEventListener('click', async () => {
            if (node.isLobby && !li.className.includes('disabled')) {
                log('Attempting to join', peerName)
                li.className += ' disabled'

                await node.joinPeer(peer)
                log(`Now waiting in ${peerName}'s room`)
            }
        })

        peerList.appendChild(li)
    } else {
        log(peerName, 'has left the lobby')
        peerList.removeChild(document.getElementById(`lobby-${peer}`)!)

        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0])
    }
}