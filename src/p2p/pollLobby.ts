import Errors, {buildError} from '../config/errors'
import {Introduction} from '../messages'
import {
    allPeerGroups,
    allPeerNames,
    ConnectionStatus,
    groupPeerIDs,
    leaderId,
    LOBBY_ID,
    lobbyPeerIDs,
    MISSING_WAIT,
    myID,
    roomID,
    status,
} from '../config/constants'
import ipfs from './ipfs'
import {groupLeft, lobbyJoin, lobbyLeft} from '../config/events'
import broadcast from './broadcast'
import joinGroup from './joinGroup'
import milliseconds = require('mocha/lib/ms')

/**
 * Runs a check against ipfs.pubsub.peers to find who has left and entered the lobby.
 * After completion will run again in `this.pollInterval`ms.
 *
 * Doesn't track peers who left and came back.
 */

export default async function(pollInterval: number) {
    while (status == ConnectionStatus.IN_LOBBY)
        try {
            // TODO make dryer with pollRoom
            const updatedPeerList = await ipfs.pubsub.peers(LOBBY_ID)

            const missingPeers = new Set
            const peersJoined = updatedPeerList.filter(peer => !lobbyPeerIDs.has(peer))
            const peersLeft = [...lobbyPeerIDs].filter(peer => !updatedPeerList.includes(peer))


            for (const peer of peersJoined) {
                if (peer == myID) continue // don't track self

                // An unknown peer joined the lobby
                if (!allPeerNames.has(peer))
                    missingPeers.add(peer)

                // we know them, but didn't know they were in the lobby
                else if (!lobbyPeerIDs.has(peer))
                    lobbyJoin.activate(peer)
            }

            for (const peer of peersLeft) {
                if (peer == myID) continue // don't track self

                // Peer is leaving the lobby
                if (lobbyPeerIDs.has(peer))
                    lobbyLeft.activate(peer)

                // someone from group disconnected
                if (groupPeerIDs().has(peer)) {
                    allPeerGroups.set(peer, '')
                    groupLeft.activate(peer)
                }

                // The leader of our group left, so we should leave too.
                if (peer == leaderId)
                    await joinGroup('')
            }

            // Introduce myself if someone we don't know joined
            if (missingPeers.size)
            // Wait for some time for since the peer may have introduced themselves and we don't need more info back
                await new Promise(resolve => {
                    // A peer is no longer missing once we find them
                    const cancel = lobbyJoin.onCancellable(peer => missingPeers.delete(peer))

                    setTimeout(async () => {
                        cancel()

                        // check incase we have left the lobby. (easier than cancelling this timeout)
                        if (roomID()!)
                            await broadcast(
                                new Introduction(name, leaderId, missingPeers.size > 0))

                        resolve()
                    }, MISSING_WAIT)
                })

            await milliseconds(pollInterval)
        } catch (cause) {
            return buildError(Errors.POLLING_LOBBY, { cause })
        }
}
