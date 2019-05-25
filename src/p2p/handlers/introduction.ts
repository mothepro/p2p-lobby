import {PeerID} from 'ipfs'
import Introduction from '../../messages/Introduction'
import {allPeerNames} from '../../config/constants'
import {lobbyJoin} from '../../config/events'

/** A peer we don't know introduced themselves */
export default function(from: PeerID, {name}: Introduction) {
    if (!allPeerNames.has(from)) {
        allPeerNames.set(from, name)
        lobbyJoin.activate(from)
    }
}
