import Emitter from 'fancy-emitter'
import {PeerID} from 'ipfs'
import {ConnectionStatus, inGroup, lobbyPeerIDs, myGroupPeerIDs, myID, resetLeaderId, setStatus} from './constants'

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
export const lobbyChange = Emitter.merge({ lobbyJoin, lobbyLeft })

/** A new group is made */
export const groupStart = new Emitter
/** A group is closed */
export const groupDone = new Emitter
/** A peer has joined my group */
export const groupJoin = new Emitter<PeerID>()
/** A peer has left my group */
export const groupLeft = new Emitter<PeerID>()
/** A peer has joined or left my group */
export const groupChange = Emitter.merge({ groupJoin, groupLeft })
/** A group leader has asked you to join their group */
export const groupInvite = new Emitter<{
    leader: PeerID
    members: Set<PeerID>
    confirmation(accept: boolean): void
}>()
/** A peer has requested to join your group */
export const groupRequest = new Emitter<{
    peer: PeerID
    confirmation(accept: boolean): void
}>()
/** The group leader has requested to move group members to a private room */
export const groupReadyInit = new Emitter<any>()
/** Connected to private room which will soon have all group members */
export const groupConnect = new Emitter
/** The group and all members are ready in shared room */
export const groupReady = new Emitter

// Update peers in the lobby
lobbyChange.onContinueAfterError(({ name, value }) => (name == 'lobbyJoin' ? lobbyPeerIDs.add : lobbyPeerIDs.delete)(value))

// Update status when group is ready
groupReady.onContinueAfterError(() => setStatus(ConnectionStatus.IN_ROOM))

// Clear group
groupLeft.onContinueAfterError(() => !inGroup() && groupDone.activate())
groupDone.onContinueAfterError(() => resetLeaderId())

// Activate `join` for all peer's in group after starting
groupStart.onContinueAfterError(() => {
    for (const peer of myGroupPeerIDs())
        if (peer != myID)
            groupJoin.activate(peer)
})
