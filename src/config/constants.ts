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

/** ID's of all peers and their group leader's id. */
export const allPeerGroups: Map<PeerID, PeerID> = new Map

/** ID's of all peers in lobby. */
export const lobbyPeerIDs: Set<PeerID> = new Set

/** ID's of all peers in lobby and their name. */
export const lobbyPeerNames = () => peersInSet(lobbyPeerIDs)

/** ID of my p2p node. */
export let id: PeerID = ''
export function setId(newId: PeerID) { id = newId }

/** ID of group leader. */
export let leaderId: PeerID = id
export function resetLeaderId(newId: PeerID = id) { leaderId = newId }

/** Name of my p2p node. */
export let name: NameType

/** The Room ID of the lobby */
export let LOBBY_ID: RoomID

/** Whether or not the current leader of a group. */
export const isLeader = () => isConnected() && id == leaderId

/** Whether or not in a group. */
export const inGroup = () => !!groupPeerIDs().size

/** ID's of MY group members. */
export function groupPeerIDs(): ReadonlySet<PeerID> {
    const group = new Set
    if (leaderId) // Only do this if already in a group
        for (const [peer, leader] of allPeerGroups)
            if (leader == leaderId)
                group.add(peer)
    return group
}

/** ID's of MY group members and their name. */
export function groupPeerNames() { return peersInSet(groupPeerIDs()) }

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
export function initialize<T>(myName: T, pkg: string, ipfsOptions?: Partial<IPFSOptions>) {
    if (name || LOBBY_ID)
        throw buildError(Errors.NO_REINITIALIZE)

    name = myName
    LOBBY_ID = `${pkg}_lobby_${version}`

    if (!ipfs)
        makeIPFS({...ipfsOptions, pkg})
}
