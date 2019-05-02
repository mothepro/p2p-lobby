const enum Errors {
    NAME_ALREADY_SET      = 'The name can not be modified once set',
    LOBBY_ID_ALREADY_SET  = 'The lobby ID can not be modified once set',
    UNEXPECTED_PEER       = 'Connection from an unexpected peer',
    MUST_BE_IN_LOBBY      = 'Must be in the lobby to do this',
    MUST_BE_IN_ROOM       = 'Must be in a room to do this',
    LEADER_READY_UP       = 'Only the group leader of a group can ready up',
    ROOM_NOT_READY        = 'Can not perform this action until the room is ready',
    LIST_MISMATCH         = 'Our list of peers is inconsistent with the peer we joined',
    UNEXPECTED_MESSAGE    = 'An unexpected message was recieved',
    LEADER_IN_GROUP       = 'The peer youre trying to join is already in a different group',
    POLLING_LOBBY         = 'An error was encountered while polling peers in the lobby',
    POLLING_ROOM          = 'An error was encountered while polling peers in a room',
}

export default Errors // Can't be all in one line :(

/** Builds an `Error` instance to use. */
export function buildError(error: Errors | Error, extra?: { [prop: string]: any }): Error {
    if (!(error instanceof Error))
        error = Error(error)
    if (extra)
        for (const [prop, value] of Object.entries(extra))
            (error as any)[prop] = value
    return error
}
