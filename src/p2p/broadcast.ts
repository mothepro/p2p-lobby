import ipfs from './ipfs'
import { pack } from '../packer'
import { myID, roomID } from '../config/constants'
import { buildError } from '../config/errors'
import { handleMessage } from './listener'

/**
 * `Pack`s and Broadcasts data to all peers in the room.
 *
 * If successful, the sent message is handled,
 * as if we have just received something from ourselves.
 */
export default async function(data: any) {
    if (roomID())
        try {
            await ipfs.pubsub.publish(roomID()!, pack(data) as Buffer)
            await handleMessage(myID, data)
        } catch (e) {
            throw buildError(e, { data, roomID: roomID() })
        }
}
