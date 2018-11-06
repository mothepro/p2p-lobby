import P2P, {Events} from '../..'
import lobbyConnect from './lobbyConnect'
import myRoomConnect from './myRoomConnect'
import log from './log'
import { RandomRequest } from './messages'
import { htmlSafe } from './util'
import { PeerID } from 'ipfs'

const myPeerList    = document.getElementById('my-peers')! as HTMLUListElement,
      lobbyPeerList = document.getElementById('lobby-peers')! as HTMLUListElement,
      chatbox       = document.getElementById('chatbox')! as HTMLDivElement,
      rejoinBtn     = document.getElementById('rejoin')! as HTMLButtonElement

/** binds the events for the node */
export default function bindNode(node: P2P<string>) {
    node.on(Events.error, log)

    node.on(Events.connected, () => log('Node connected'))
    node.on(Events.disconnected, () => {
        myPeerList.innerHTML = ''
        lobbyPeerList.innerHTML = ''
        chatbox.style.display = 'none'
        rejoinBtn.style.display = 'block'

        log('Node disconnected')
    })

    node.on(Events.peerJoin, peer => log('Welcome', htmlSafe(node.peers.get(peer))))
    node.on(Events.peerLeft, peer => log('See ya', htmlSafe(node.peers.get(peer))))

    node.on(Events.lobbyChange, peerState => lobbyConnect(node, peerState))
    node.on(Events.meChange, peerState => myRoomConnect(node, peerState))

    // Show chat box and clear peer lists for new peers
    node.on(Events.roomReady, () => {
        log('Room ready')
        // We dont care about the lobby anymore, but don't remove if they join back
        lobbyPeerList.innerHTML = ''
        myPeerList.innerHTML = ''
        chatbox.style.display = 'block'

        const li = document.createElement('li')
        li.className = 'list-group-item list-group-item-primary'
        li.innerHTML = 'Peers in this room'
        myPeerList.appendChild(li)

        for(const [peerId, name] of node.peers) {
            const li = document.createElement('li')
            li.className = 'list-group-item'
            li.innerHTML = htmlSafe(name)
            li.id = `mine-${peerId}`
            myPeerList.appendChild(li)
        }
    })

    // Incoming messages
    node.on(Events.data, ({peer, data}: {peer: PeerID, data: any}) => {
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
