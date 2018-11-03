import P2P from '../..'
import {PeerID} from 'ipfs'
import log from './log'

const peerList = document.getElementById('my-peers')! as HTMLUListElement

/** This is triggered when someone joines my room */
export default function myRoomConnect(
    node: P2P<any>,
    {peer, joined}: {peer: PeerID, joined: boolean},
) {
    const peerName = node.peers.get(peer)!

    if (joined) {
        log(peerName, 'has joined our room')

        if (peerList.childNodes.length == 0) { // Add title
            const li = document.createElement('li')
            li.className = 'list-group-item list-group-item-primary'
            li.innerHTML = `List of peers connected our room<br>
            When all desired peers have joined click here to ready the room`

            li.addEventListener('click', async () => {
                log('Attempting ready the room', peerName)
                await node.readyUp()
                log(`Room is ready with ${node.peers} peers`)
            })
            peerList.appendChild(li)
        }

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-action'
        li.innerHTML = peerName
        li.id = `mine-${peer}`
        peerList.appendChild(li)
    } else {
        log(peerName, 'has left our room')
        peerList.removeChild(document.getElementById(`mine-${peer}`)!)

        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0])
    }
}