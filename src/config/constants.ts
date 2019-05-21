import {PeerID, RoomID} from 'ipfs'
import {version} from '../../package.json'
import Errors, {buildError} from './errors'
import ipfs, {IPFSOptions, makeIPFS} from '../p2p/ipfs'

export type NameType = any
export type ReadyUpType = any

/* The values here hold the general state of the p2p node and IPFS peers. */

/** Possible status' of the p2p node. */
export const enum ConnectionStatus {
    OFFLINE,
    READY,
    DISCONNECTING,
    CONNECTING,

    ONLINE,
    JOINING,
    IN_LOBBY,
    WAITING_FOR_GROUP,
    IN_ROOM,
}

/** Time to wait for an introduction from a peer we don't know who just connected */
export const MISSING_WAIT = 5 * 1000

/** How often to check for peers when waiting for them in the room's group */
export const ROOM_WAITING_POLL_INTERVAL = 2 * 1000

/** How often to check for peers once we know everyone is in the room's group */
export const ROOM_READY_POLL_INTERVAL = 15 * 1000

/** The p2p node's status. */
export let status = ConnectionStatus.OFFLINE

// TODO Possibly use the `typestate` package to ensure the status is always sane.
export const setStatus = (newStatus: ConnectionStatus) => status = newStatus

/** Whether or not the node is connected to the network. */
export const isConnected = () =>
    status == ConnectionStatus.ONLINE ||
    status == ConnectionStatus.JOINING ||
    status == ConnectionStatus.IN_LOBBY ||
    status == ConnectionStatus.WAITING_FOR_GROUP ||
    status == ConnectionStatus.IN_ROOM

/** ID's of all we have ever met and their name. */
export const allPeerNames: Map<PeerID, NameType> = new Map

/** The peers and the ID of the leader of the group they wanna be in. */
export const allGroupRequests: Map<PeerID, PeerID> = new Map

/** The group leaders and the members of their group */
export const allGroupInvites: Map<PeerID, Set<PeerID>> = new Map

/** ID's of all peers in lobby. */
export const lobbyPeerIDs: Set<PeerID> = new Set

/** ID's of all peers in lobby and their name. */
export const lobbyPeerNames = () => peersInSet(lobbyPeerIDs)

/** ID of my p2p node. */
export let myID: PeerID = ''
export function setId(id: PeerID) { myID = id }

/** ID of group leader. */
export let leaderId: PeerID = myID
export function resetLeaderId(id: PeerID = myID) { leaderId = id }

/** Name of my p2p node. */
export let myName: NameType

/** The Room ID of the lobby */
export let LOBBY_ID: RoomID

/** Whether or not the current leader of a group. */
export const isLeader = () => isConnected() && myID == leaderId

/**
 * All the groups which have been formed in the lobby.
 *
 * To be in a group the peer must be invited and also send a request for the group.
 * Either the peer or the leader can change their status,
 * leaving or kicking the peer from the group respectively.
 */
export function allGroups(): Map<PeerID, Set<PeerID>> {
    const groups = new Map

    // Remove peers which haven't requested to be in the group
    for (const [leader, peers] of allGroupInvites) {
        const members = new Set

        for (const peer of peers)
            if (allGroupRequests.has(peer) && leader == allGroupRequests.get(peer))
                members.add(peer)

        // If there are members add the leader and return the group
        if (members.size)
            groups.set(leader, members.add(leader))
    }

    return groups
}

/** Whether or not in a group. */
export const inGroup = () => !!myGroupPeerIDs().size

/** ID's of MY group members. */
export function myGroupPeerIDs(): ReadonlySet<PeerID> { return allGroups().get(leaderId) || new Set }

/** ID's of MY group members and their name. */
export function myGroupPeerNames() { return peersInSet(myGroupPeerIDs()) }

/** The ID of the IPFS room we are currently connected to. */
export function roomID(): RoomID | undefined {
    switch (status) {
        case ConnectionStatus.IN_LOBBY:
            return LOBBY_ID
        case ConnectionStatus.WAITING_FOR_GROUP:
        case ConnectionStatus.IN_ROOM:
            return leaderId
    }
}

/** The name of a peer given their ID. */
export const getPeerName = (peer: PeerID) => allPeerNames.get(peer)

function peersInSet(set: ReadonlySet<PeerID>): Map<PeerID, NameType> {
    const peers = new Map
    for (const peerId of set)
        peers.set(peerId, getPeerName(peerId)) // should never be null
    return peers
}

/** Create a P2P Node if one hasn't been created already. */
export function initialize<T>(name: T, pkg: string, ipfsOptions?: Partial<IPFSOptions>) {
    if (myName || LOBBY_ID)
        throw buildError(Errors.NO_REINITIALIZE)

    myName = name
    LOBBY_ID = `${pkg}_lobby_${version}`

    if (!ipfs)
        makeIPFS({...ipfsOptions, pkg})
}
