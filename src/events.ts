import {PeerID} from 'ipfs'

const enum Events {
    /** An error occured */
    error,

    /** Recieved some data */
    data,

    /** Connected to the P2P network */
    connected,
    /** Disconnected from the P2P network */
    disconnected,

    /** Connected to the lobby */
    lobbyConnect,
    /** A peer has joined the lobby */
    lobbyJoin,
    /** A peer has left the lobby */
    lobbyLeft,
    /** A peer has joined or left the lobby */
    lobbyChange,

    /** A new group is made */
    groupStart,
    /** A group is closed */
    groupDone,
    /** A peer has joined my group */
    groupJoin,
    /** A peer has left my group */
    groupLeft,
    /** A peer has joined or left my group */
    groupChange,
    /** The group and all members are ready in shared room */
    groupReady,

    /** The group leader has requested to move group members to a private room */
    groupReadyInit,
    /** Connected to private room which will soon have all group members */
    groupConnect,
}

/** The data which should be emitted with every event. */
export interface EventMap {
    [Events.error]: Error

    [Events.data]: {peer: PeerID, data: any}

    [Events.connected]: void
    [Events.disconnected]: void

    [Events.lobbyConnect]: void
    [Events.lobbyJoin]: PeerID
    [Events.lobbyLeft]: PeerID
    [Events.lobbyChange]: {peer: PeerID, joined: boolean}

    [Events.groupStart]: void
    [Events.groupDone]: void
    [Events.groupJoin]: PeerID
    [Events.groupLeft]: PeerID
    [Events.groupChange]: {peer: PeerID, joined: boolean}

    [Events.groupReady]: void
    [Events.groupReadyInit]: any
    [Events.groupConnect]: void
}

export default Events // Can't be all in one line :(
