import {Message} from 'ipfs'
import Emitter from 'fancy-emitter'
import {
    allPeerGroups,
    allPeerNames,
    ConnectionStatus,
    id,
    leaderId,
    LOBBY_ID,
    lobbyPeerIDs,
    resetLeaderId,
    roomID,
    setStatus,
    status,
} from '../config/constants'
import Errors, {buildError} from '../config/errors'
import {
    data as dataEmitter,
    groupConnect,
    groupJoin,
    groupReadyInit,
    groupStart,
    lobbyJoin,
    lobbyLeft,
} from '../config/events'
import {unpack} from '../packer'
import hash from '../util/hash'
import {Introduction, ReadyUpInfo} from '../messages'
import {seedInt} from '../util/rng'
import ipfs from './ipfs'
import broadcast from './broadcast'
import pollRoom from './pollRoom'
import {leaveRoom} from './disconnect'

/**
 * An emitter that should be activated when a message is recieved.
 *
 * *This includes messages that **our node** sends.*
 */
const msgEmitter = new Emitter<Message>()

;(async function() { // await not allowed at top scope
    for await (const { from, data: raw } of msgEmitter.future) {
        const peer = from.toString(),
            data = peer == id
                ? raw // no need to unpack data not sent over the wire
                : unpack(raw)

        switch (status) {
            case ConnectionStatus.IN_ROOM:
                dataEmitter.activate({ data, peer })
                break

            case ConnectionStatus.IN_LOBBY:
                if (data instanceof ReadyUpInfo) {
                    if (peer == leaderId) {
                        try {
                            setStatus(ConnectionStatus.JOINING)
                            // TODO: Wait for peers before failing?
                            if (hash() != data.hash)
                                throw buildError(Errors.LIST_MISMATCH)
                            seedInt(data.hash)
                            groupReadyInit.activate(data.info)
                            await leaveRoom(LOBBY_ID)
                            await ipfs.pubsub.subscribe(leaderId, msgEmitter.activate, { discover: true })
                            groupConnect.activate()
                            setStatus(ConnectionStatus.WAITING_FOR_GROUP)
                            pollRoom()
                        } catch (e) {
                            setStatus(ConnectionStatus.IN_LOBBY)
                            throw e
                        }
                    } else
                        // clean lobby of groups we know are leaving
                        for (const [other, leader] of allPeerGroups)
                            if (leader == peer) {
                                lobbyPeerIDs.delete(other)
                                allPeerGroups
                                lobbyLeft.activate(other)
                            }

                    break

                } else if (data instanceof Introduction) {
                    // we don't care about our own Introductions in the lobby
                    if (peer == id)
                        break

                    // Introduce ourselves if peer we already know who wants to meet us.
                    // (Otherwise the poller will handle it)
                    if (allPeerNames.has(peer) && data.infoRequest)
                        broadcast(new Introduction(name, leaderId))

                    // A peer we don't know introduced themselves
                    if (!allPeerNames.has(peer)) {
                        allPeerNames.set(peer, data.name)
                        lobbyJoin.activate(peer)
                    }

                    // Joining a group with me
                    if (!this.myGroup.has(peer) && (
                        (this.leader && data.leader == this.leader)  // peer is joining the group im in
                        || (!this.inGroup && data.leader == this.id) // peer is making me the leader of a new group
                    )) {
                        // I am a group leader now
                        if (!this.inGroup) {
                            resetLeaderId(id)
                            groupStart.activate()
                        }
                        groupJoin.activate(peer)
                    }

                    // Change group that peer belongs to
                    this.allGroups.set(peer, data.leader)

                    // Leaving a group with me
                    if (this.myGroup.has(peer) && data.leader != this.leader) {
                        if (!this.inGroup) // Everyone left my room :(
                            resetLeaderId()
                        this.groupLeft.activate(peer)
                    }

                    break
                }
                // Intentional fall-thru

            default:
                throw buildError(Errors.UNEXPECTED_MESSAGE, { peer, data, roomID: roomID()! })
        }
    }
})()

export default msgEmitter
