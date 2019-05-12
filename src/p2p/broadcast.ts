import ipfs from './ipfs'
import { pack } from '../packer'
import { roomID } from '../config/constants'
import { buildError } from '../config/errors'

/**
 * Broadcasts some data to all peers in the room.
 * All data from registered objects will be `pack`ed first.
 */
export default async function(data: any) {
    try {
        if (roomID())
            await ipfs.pubsub.publish(roomID()!, pack(data) as Buffer)
    } catch (e) {
        throw buildError(e, { data, roomID: roomID() })
    }
}
