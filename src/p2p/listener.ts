import {Message, PeerID} from 'ipfs'
import {unpack} from '../packer'
import {allPeerNames, ConnectionStatus, myID, roomID, status} from '../config/constants'
import Errors, {buildError} from '../config/errors'
import {data as dataEmitter} from '../config/events'
import Introduction from '../messages/Introduction'
import Invite from '../messages/Invite'
import ReadyUp from '../messages/ReadyUp'
import handleIntroduction from './handlers/introduction'
import handleReadyUp from './handlers/readyup'
import broadcast from './broadcast'

/** Handles a message from **any** peer. */
export function handleMessage(peer: PeerID, data: any) {
    switch (status) {
        case ConnectionStatus.IN_ROOM:
            dataEmitter.activate({ data, peer })
            return

        case ConnectionStatus.IN_LOBBY:
            // Introduce myself to new peers
            if (!allPeerNames.has(peer))
                broadcast(new Introduction)

            if (typeof data == 'object') // prevent type errors
                switch (data.constructor) {
                    case Introduction:
                        return handleIntroduction(peer, data)

                    case ReadyUp:
                        return handleReadyUp(peer, data)

                    // case Invite:
                    //     return handleInvite(peer, data)
                }
    }

    throw buildError(Errors.UNEXPECTED_MESSAGE, { peer, data, roomID: roomID()! })
}

/** Listener for data sent over the wire from **another** peer. */
export default async function({ from, data }: Message) {
    if (from == myID)
        return

    return handleMessage(from, unpack(data))
}
