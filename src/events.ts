import {PeerID} from 'ipfs'

const enum Events {
    error,

    // network
    connected,
    disconnected,

    data,
    roomReady,

    // Connecting a room
    roomConnect,
    lobbyConnect,
    peerConnect,

    // Peer connections
    peerJoin,
    peerLeft,
    peerChange,

    // Lobby specific peer connections
    lobbyJoin,
    lobbyLeft,
    lobbyChange,

    // My room specific peer connections
    meJoin,
    meLeft,
    meChange,
}

/** The data which should be emitted with every event. */
export interface EventMap {
    [Events.error]: Error
    [Events.connected]: void
    [Events.disconnected]: void

    [Events.data]: {peer: PeerID, data: any}
    [Events.roomReady]: void
    [Events.roomConnect]: void
    [Events.lobbyConnect]: void
    [Events.peerConnect]: void

    [Events.peerJoin]: PeerID
    [Events.peerLeft]: PeerID
    [Events.peerChange]: {peer: PeerID, joined: boolean}

    [Events.lobbyJoin]: PeerID
    [Events.lobbyLeft]: PeerID
    [Events.lobbyChange]: {peer: PeerID, joined: boolean}

    [Events.meJoin]: PeerID
    [Events.meLeft]: PeerID
    [Events.meChange]: {peer: PeerID, joined: boolean}
}

export default Events // Can't be all in one line :(
