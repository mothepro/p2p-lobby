import ipfs from './ipfs'
import {pack} from '../packer'
import {ConnectionStatus, myID, roomID, status} from '../config/constants'
import {buildError} from '../config/errors'
import {data as dataEmitter} from '../config/events'

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

            if (status == ConnectionStatus.IN_ROOM)
                dataEmitter.activate({ data, peer: myID })
        } catch (e) {
            throw buildError(e, { data, roomID: roomID() })
        }
}
