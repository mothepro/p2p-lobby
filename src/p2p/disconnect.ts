import ipfs from './ipfs'
import {disconnected} from '../config/events'
import {buildError} from '../config/errors'
import {
    allPeerNames,
    ConnectionStatus,
    isConnected,
    lobbyPeerIDs,
    resetLeaderId,
    roomID,
    setId,
    setStatus,
    allGroupInvites,
    allGroupRequests,
} from '../config/constants'
import listener from './listener'

/** Disconnect P2P Node from the network. */
export default async function() {
    try {
        if (isConnected()) {
            // Leave rooms manually since ipfs.stop doesn't disconnect us.
            if (roomID()) // don't change status until we get the room ID
                await ipfs.pubsub.unsubscribe(roomID()!, listener)
            setStatus(ConnectionStatus.DISCONNECTING)

            allPeerNames.clear()
            allGroupInvites.clear()
            allGroupRequests.clear()
            lobbyPeerIDs.clear()
            resetLeaderId()
            await ipfs.stop()
            setId('')
            
            setStatus(ConnectionStatus.READY)
            disconnected.activate()
        }
    } catch (e) {
        disconnected.deactivate(buildError(e))
    }

    return disconnected.previous
}
