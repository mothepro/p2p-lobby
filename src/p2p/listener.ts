import {Message, PeerID} from 'ipfs'
import Errors, {buildError} from '../config/errors'
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
    groupPeerIDs,
    inGroup,
    NameType,
} from '../config/constants'
import {
    data as dataEmitter,
    groupConnect,
    groupJoin,
    groupReadyInit,
    groupStart,
    lobbyJoin,
    lobbyLeft,
    groupLeft,
} from '../config/events'
import hash from '../util/hash'
import { unpack } from '../packer'
import { Introduction, ReadyUpInfo } from '../messages'
import { seedInt } from '../util/rng'
import ipfs from './ipfs'
import broadcast from './broadcast'
import pollRoom from './pollRoom'
import { leaveRoom } from './disconnect'

async function handleReadyUp(peer: PeerID, data: ReadyUpInfo<any>) {
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

async function handleIntroduction(peer: PeerID, data: Introduction<NameType>) {
    // we don't care about our own Introductions in the lobby
    if (peer == id)
        return

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
    if (!groupPeerIDs().has(peer) && (
        (leaderId && data.leader == leaderId) // peer is joining the group im in
        || (!inGroup() && data.leader == id)  // peer is making me the leader of a new group
    )) {
        // I am a group leader now
        if (!inGroup()) {
            resetLeaderId(id)
            groupStart.activate()
        }
        groupJoin.activate(peer)
    }

    // Change group that peer belongs to
    allPeerGroups.set(peer, data.leader)

    // Leaving a group with me
    if (groupPeerIDs().has(peer) && data.leader != leaderId)
        groupLeft.activate(peer)
}

/**
 * Listener for data from any peer.
 * *This **includes** messages that from self.*
 */
export async function handle(peer: PeerID, data: any) {
    switch (status) {
        case ConnectionStatus.IN_ROOM:
            dataEmitter.activate({ data, peer })
            break

        case ConnectionStatus.IN_LOBBY:
            switch (data.constructor) {
                case ReadyUpInfo:
                    handleReadyUp(peer, data as ReadyUpInfo<any>)
                    break
                
                case Introduction:
                    handleIntroduction(peer, data as Introduction<NameType>)
                    break
            }
            // Intentional fall-thru

        default:
            throw buildError(Errors.UNEXPECTED_MESSAGE, { peer, data, roomID: roomID()! })
    }
}

/**
 * Listener for data sent over the wire.
 * *This does **not** include messages that from self.*
 */
export default async function listener({ from, data }: Message) {
    const peer = from.toString()
    if (peer != id)
        return handle(peer, unpack(data))
}
