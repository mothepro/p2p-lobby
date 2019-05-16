import Errors, {buildError} from '../config/errors'
import {
    ConnectionStatus,
    groupPeerIDs,
    id,
    inGroup,
    ROOM_READY_POLL_INTERVAL,
    ROOM_WAITING_POLL_INTERVAL,
    roomID,
    status,
} from '../config/constants'
import milliseconds from '../util/delay'
import ipfs from './ipfs'
import {PeerID, RoomID} from 'ipfs'
import {groupLeft, groupReady} from '../config/events'
import {leaveRoom} from './disconnect'

function checkForLeavers(actualPeerList: PeerID[], expectedPeerList: ReadonlySet<PeerID>) {
    for (const peer of [...expectedPeerList].filter(peer => !actualPeerList.includes(peer)))
        // Ignore self or unknown peer leaving
        if (expectedPeerList.has(peer) && peer != id)
            groupLeft.activate(peer)
}

export default async function() {
        const peersInRoom = new Set<PeerID>()

        while (inGroup())
            try {
                const updatedPeerList = await ipfs.pubsub.peers(roomID())

                switch (status) {
                    case ConnectionStatus.WAITING_FOR_GROUP:
                        const peersJoined = updatedPeerList.filter(peer => !peersInRoom!.has(peer))

                        for (const peer of peersJoined) {
                            if (peer == id) continue // don't track self

                            if (groupPeerIDs().has(peer))
                                peersInRoom.add(peer)
                            else
                                throw buildError(Errors.UNEXPECTED_PEER, {peer})
                        }

                        // All the peers who could make it are finally here.
                        if (groupPeerIDs().size == peersInRoom.size)
                            groupReady.activate()
                        checkForLeavers(updatedPeerList, peersInRoom)
                        await milliseconds(ROOM_WAITING_POLL_INTERVAL)
                        break

                    case ConnectionStatus.IN_ROOM:
                        checkForLeavers(updatedPeerList, groupPeerIDs())
                        await milliseconds(ROOM_READY_POLL_INTERVAL)
                        break

                    default:
                        throw buildError(Errors.UNEXPECTED_STATUS, {status})
                }
            } catch (cause) {
                await leaveRoom()
                throw buildError(Errors.POLLING_ROOM, { cause, roomID: roomID() })
            }
}
