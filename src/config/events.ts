import Emitter from 'fancy-emitter'
import {PeerID} from 'ipfs'
import { lobbyPeerIDs, allPeerGroups, leaderId } from './constants'

/** Some error sas throw... */
// TODO Replace with deactivations.
export const error = new Emitter<Error>()

/** Recieved some data */
export const data = new Emitter<{peer: PeerID, data: any}>()

/** Connected to the P2P network */
export const connected = new Emitter
/** Disconnected from the P2P network */
export const disconnected = new Emitter

/** Connected to the lobby */
export const lobbyConnect = new Emitter
/** A peer has joined the lobby */
export const lobbyJoin = new Emitter<PeerID>()
/** A peer has left the lobby */
export const lobbyLeft = new Emitter<PeerID>()
/** A peer has joined or left the lobby */
export const lobbyChange = new Emitter<{peer: PeerID, joined: boolean}>()

/** A new group is made */
export const groupStart = new Emitter
/** A group is closed */
export const groupDone = new Emitter
/** A peer has joined my group */
export const groupJoin = new Emitter<PeerID>()
/** A peer has left my group */
export const groupLeft = new Emitter<PeerID>()
/** A peer has joined or left my group */
export const groupChange = new Emitter<{peer: PeerID, joined: boolean}>()
/** The group and all members are ready in shared room */
export const groupReady = new Emitter

/** The group leader has requested to move group members to a private room */
export const groupReadyInit = new Emitter<any>()
/** Connected to private room which will soon have all group members */
export const groupConnect = new Emitter

// The following emitters can make smart changes
lobbyJoin.onContinueAfterError(peer => lobbyChange.activate({ peer, joined: true }))
lobbyLeft.onContinueAfterError(peer => lobbyChange.activate({ peer, joined: false }))
groupJoin.onContinueAfterError(peer => groupChange.activate({ peer, joined: true }))
groupLeft.onContinueAfterError(peer => groupChange.activate({ peer, joined: false }))

// update peers in the lobby
lobbyChange.onContinueAfterError(({ peer, joined }) => (joined ? lobbyPeerIDs.add : lobbyPeerIDs.delete)(peer))
// set a peer in my group, or remove them from any group in general groups
groupChange.onContinueAfterError(({ peer, joined }) => allPeerGroups.set(peer, joined ? leaderId : ''))