const enum Errors {
    SYNC_JOIN           = 'Can not join another room until previous connection is complete',
    UNEXPECTED_PEER     = 'Connection from an unexpected peer',
    MUST_BE_IN_LOBBY    = 'Must be in the lobby to do this',
    MUST_BE_IN_ROOM     = 'Must be in a room to do this',
    LEADER_READY_UP     = 'Only the group leader of a group can ready up',
    ROOM_NOT_READY      = 'Can not perform this action until the room is ready',
    LIST_MISMATCH       = 'Our list of peers is inconsistent with the peer we joined',
    UNEXPECTED_MESSAGE  = 'An unexpected message was recieved',
    POLLING_LOBBY       = 'An error was encountered while polling peers in the lobby',
    POLLING_ROOM        = 'An error was encountered while polling peers in a room',
}

export default Errors // Can't be all in one line :(
