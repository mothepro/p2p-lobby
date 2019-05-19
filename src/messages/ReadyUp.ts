import register, {PackableInst} from '../packer'
import {ReadyUpType} from '../config/constants'

/**
 * The group leader is ready to start.
 * This contains all the information about connected peers to ensure all the right peers join.
 * And that they know each other when in room.
 */
export default class ReadyUp implements PackableInst {
    constructor(
        public hash: number,
        public info?: ReadyUpType,
    ) {}

    static pack   = ({hash, info}: ReadyUp) =>
        info == undefined
            ? hash
            : [hash, info]

    static unpack = (hash: number | [number, ReadyUpType]) =>
        typeof hash == 'number'
            ? new ReadyUp(hash)
            : new ReadyUp(hash[0], hash[1])
}

register(ReadyUp)
