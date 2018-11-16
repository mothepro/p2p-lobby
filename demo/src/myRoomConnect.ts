import P2P from '../..'
import {PeerID} from 'ipfs'
import log from './log'
import { htmlSafe } from './util'

const peerList = document.getElementById('my-peers')! as HTMLUListElement
let numPeersWaiting = 0

export function hasPeers() {
    return !!numPeersWaiting
}

/** This is triggered when someone joines my room */
export default function myRoomConnect(
    node: P2P<any>,
    {peer, joined}: {peer: PeerID, joined: boolean},
) {
    const peerName = htmlSafe(node.getPeerName(peer)!)

    if (joined) {
        numPeersWaiting++
        log(peerName, 'has joined our room')
        // can't join others if someone is waiting on me
        document.querySelectorAll('.joinBtn').forEach(btn => btn.remove())

        if (peerList.childNodes.length == 0) { // Add title
            const li = document.createElement('li')
            li.className = 'list-group-item list-group-item-primary d-flex align-items-center justify-content-between'
            li.innerHTML = 'Peers in our room'

            const readyBtn = document.createElement('button')
            readyBtn.className = 'btn btn-outline-primary'
            readyBtn.innerHTML = 'Ready Up'
            readyBtn.addEventListener('click', async () => {
                readyBtn.disabled = true
                log('Attempting ready the room')
                await node.readyUp()
                log('Room is ready with ', node.groupPeers.size, 'peers')
            })

            li.appendChild(readyBtn)
            peerList.appendChild(li)
        }

        const li = document.createElement('li')
        li.className = 'list-group-item'
        li.innerHTML = peerName
        li.id = `mine-${peer}`
        peerList.appendChild(li)
    } else {
        numPeersWaiting--
        log(peerName, 'has left our room')
        peerList.removeChild(document.getElementById(`mine-${peer}`)!)

        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0])
    }
}
