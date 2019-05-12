import { status, ConnectionStatus, isLeader } from '../config/constants'
import Errors, { buildError } from '../config/errors'
import hash from '../util/hash'
import { ReadyUpInfo } from '../messages'
import broadcast from './broadcast'

/**
 * Safely broadcasts to all member's of the group that
 * they need to move to the group leader's room.
 * 
 * Additional info can be sent along as well.
 */
export default function(info?: any) {
    if (status != ConnectionStatus.IN_LOBBY)
        throw buildError(Errors.MUST_BE_IN_LOBBY)

    if (!isLeader())
        throw buildError(Errors.LEADER_READY_UP)

    return broadcast(new ReadyUpInfo(hash(), info))
}
