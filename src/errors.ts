const enum Errors {
    SYNC_JOIN           = 'Can not join another room until previous connection is complete',
    BAD_PEERID          = 'The given peer id is invalid',
    MUST_BE_IN_ROOM     = 'Must be in a room to do this',
    NOT_CONNECTED       = 'Wait for `connect` method to resolve',
    READY_UP            = 'Must be in lobby to ready up',
    NO_PEERS_IN_ROOM    = 'No other peers have entred this room',
    ROOM_NOT_READY      = 'Can not perform this action until the room is ready',
    LIST_MISMATCH       = 'Our list or peers is inconsistent with the peer we joined',
    UNEXPECTED_MESSAGE  = 'An unexpected message was recieved',
    POLLING             = 'An error was encountered while polling peers in a room',
}

export default Errors // Can't be all in one line :(
