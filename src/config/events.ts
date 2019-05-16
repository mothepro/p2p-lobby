import Emitter from 'fancy-emitter'
import {PeerID} from 'ipfs'
import {allPeerGroups, ConnectionStatus, inGroup, leaderId, lobbyPeerIDs, resetLeaderId, setStatus, groupPeerIDs} from './constants'

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
/** The group leader has requested to move group members to a private room */
export const groupReadyInit = new Emitter<any>()
/** Connected to private room which will soon have all group members */
export const groupConnect = new Emitter
/** The group and all members are ready in shared room */
export const groupReady = new Emitter

// The following emitters can make smart changes
lobbyJoin.onContinueAfterError(peer => lobbyChange.activate({ peer, joined: true }))
lobbyLeft.onContinueAfterError(peer => lobbyChange.activate({ peer, joined: false }))
groupJoin.onContinueAfterError(peer => groupChange.activate({ peer, joined: true }))
groupLeft.onContinueAfterError(peer => {
    groupChange.activate({peer, joined: false})
    if (!inGroup())
        groupDone.activate()
})

// Update peers in the lobby
lobbyChange.onContinueAfterError(({ peer, joined }) => (joined ? lobbyPeerIDs.add : lobbyPeerIDs.delete)(peer))

// Set a peer in my group, or remove them from any group in general groups
groupChange.onContinueAfterError(({ peer, joined }) => allPeerGroups.set(peer, joined ? leaderId : ''))

// Update status when group is ready
groupReady.onContinueAfterError(() => setStatus(ConnectionStatus.IN_ROOM))

// Clear group
groupDone.onContinueAfterError(() => resetLeaderId())

// Activate `join` for all peer's in group after starting
groupStart.onContinueAfterError(() => {
    for (const peer of groupPeerIDs())
        groupJoin.activate(peer)
})
