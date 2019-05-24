import {PeerID} from 'ipfs'
import Errors, {buildError} from '../config/errors'
import {
    allPeerGroups,
    ConnectionStatus,
    groupPeerIDs,
    leaderId,
    lobbyPeerIDs,
    myID,
    resetLeaderId,
    status,
} from '../config/constants'
import {groupStart} from '../config/events'
import {Introduction} from '../messages'
import broadcast from './broadcast'

/** Joins a new group. */
// TODO: Return if successful and allow confirmation
export default async function(peer: PeerID) {
    if (peer == leaderId || peer == myID)
        return

    if (status != ConnectionStatus.IN_LOBBY)
        throw buildError(Errors.MUST_BE_IN_LOBBY)

    if (lobbyPeerIDs.has(peer)
        && allPeerGroups.get(peer) != ''
        && allPeerGroups.get(peer) != peer)
        throw buildError(Errors.LEADER_IN_GROUP)

    if (peer) // since they may be leaving a group (peer == '')
        allPeerGroups.set(peer, peer)
    resetLeaderId(peer)

    groupStart.activate() // TODO double check this

    return broadcast(new Introduction(name, leaderId, false))
}
