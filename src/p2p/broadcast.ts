import ipfs from './ipfs'
import { roomID, ConnectionStatus, status, isLeader, id } from '../config/constants'
import Errors, { buildError } from '../config/errors'
import hash from '../util/hash'
import { ReadyUpInfo } from '../messages'
import { pack } from '../packer'
import {handleMessage} from './messageListener'

/**
 * Broadcast data to all peers in the room.
 * All data from registered objects will be `pack`ed first.
 */
async function broadcast(data: any) {
    return ipfs.pubsub.publish(roomID()!, pack(data) as Buffer)
        .catch(e => Promise.reject(buildError(e, { data, roomID: roomID() })))
}

/**
 * `Pack`s and Broadcasts data to all peers in the room.
 * 
 * Calls the message listener on given data for self
 * which will eventually be called by the other peers.
 */
export default async function(data: any) {
    if (roomID())
        return Promise.all([
            broadcast(data),
            handleMessage(id, data),
        ])
}
