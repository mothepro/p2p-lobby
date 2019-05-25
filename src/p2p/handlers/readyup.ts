import {PeerID} from 'ipfs'
import Errors, {buildError} from '../../config/errors'
import {ConnectionStatus, leaderId, LOBBY_ID, lobbyPeerIDs, setStatus, allGroupRequests, allGroups} from '../../config/constants'
import pollRoom from '../pollRoom'
import {seedInt} from '../../util/rng'
import hash from '../../util/hash'
import ipfs from '../ipfs'
import {groupConnect, groupReadyInit, lobbyLeft} from '../../config/events'
import listener from '../listener'
import ReadyUp from '../../messages/ReadyUp'

export default async function (peer: PeerID, data: ReadyUp) {
    if (peer == leaderId) // My group is ready
        try {
            setStatus(ConnectionStatus.JOINING)
            // TODO: Wait for peers before failing?
            if (hash() != data.hash)
                throw buildError(Errors.LIST_MISMATCH)
            seedInt(data.hash)
            groupReadyInit.activate(data.info)
            await ipfs.pubsub.unsubscribe(LOBBY_ID, listener)
            await ipfs.pubsub.subscribe(leaderId, listener, { discover: true })
            groupConnect.activate()
            setStatus(ConnectionStatus.WAITING_FOR_GROUP)
            pollRoom()
        } catch (e) {
            setStatus(ConnectionStatus.IN_LOBBY)
            throw e
        }
    else // Clean lobby of groups we know are leaving
        if (allGroups().has(peer))
            for (const leaver of allGroups().get(peer)) {
                lobbyPeerIDs.delete(leaver)
                lobbyLeft.activate(leaver)
            }
}
