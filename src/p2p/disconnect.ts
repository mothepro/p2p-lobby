import ipfs from './ipfs'
import {disconnected} from '../config/events'
import {buildError} from '../config/errors'
import {
    allPeerGroups,
    allPeerNames,
    ConnectionStatus,
    isConnected,
    lobbyPeerIDs,
    resetLeaderId,
    roomID,
    setStatus,
    setId,
} from '../config/constants'
import listener from './listener'

/** Leaves a room we are connected to, if any. */
export async function leaveRoom(roomId = roomID()) {
    if (roomId)
        return ipfs.pubsub.unsubscribe(roomId, listener)
            .then(() => {
                resetLeaderId('')
                setStatus(ConnectionStatus.ONLINE)
            })
}

/** Disconnect P2P Node from the network. */
export default async function() {
    if (isConnected()) {
        // Leave rooms manually since ipfs.stop doesn't disconnect us.
        await leaveRoom()
        setStatus(ConnectionStatus.DISCONNECTING)
        allPeerNames.clear()
        allPeerGroups.clear()
        lobbyPeerIDs.clear()
        resetLeaderId()
        try {
            await ipfs.stop()
            setId('')
            setStatus(ConnectionStatus.READY)
            disconnected.activate()
        } catch (e) {
            return disconnected.deactivate(buildError(e))
        }
    }
    return disconnected.previous
}
