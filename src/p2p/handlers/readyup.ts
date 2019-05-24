import {PeerID} from 'ipfs'
import Errors, {buildError} from '../../config/errors'
import {ReadyUpInfo} from '../../messages'
import {allPeerGroups, ConnectionStatus, leaderId, LOBBY_ID, lobbyPeerIDs, setStatus} from '../../config/constants'
import {leaveRoom} from '../disconnect'
import pollRoom from '../pollRoom'
import {seedInt} from '../../util/rng'
import hash from '../../util/hash'
import ipfs from '../ipfs'
import {groupConnect, groupReadyInit, lobbyLeft} from '../../config/events'
import listener from '../listener'

export default async function (peer: PeerID, data: ReadyUpInfo<any>) {
    if (peer == leaderId) // My group is ready
        try {
            setStatus(ConnectionStatus.JOINING)
            // TODO: Wait for peers before failing?
            if (hash() != data.hash)
                throw buildError(Errors.LIST_MISMATCH)
            seedInt(data.hash)
            groupReadyInit.activate(data.info)
            await leaveRoom(LOBBY_ID)
            await ipfs.pubsub.subscribe(leaderId, listener, { discover: true })
            groupConnect.activate()
            setStatus(ConnectionStatus.WAITING_FOR_GROUP)
            pollRoom()
        } catch (e) {
            setStatus(ConnectionStatus.IN_LOBBY)
            throw e
        }
    else // Clean lobby of groups we know are leaving
        for (const [other, leader] of allPeerGroups)
            if (leader == peer) {
                lobbyPeerIDs.delete(other)
                allPeerGroups
                lobbyLeft.activate(other)
            }
}
