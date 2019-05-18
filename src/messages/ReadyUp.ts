import register, {PackableInst} from '../packer'

/**
 * The group leader is ready to start.
 * This contains all the information about connected peers to ensure all the right peers join.
 * And that they know each other when in room.
 */
export default class ReadyUp implements PackableInst {
    constructor(
        public hash: number,
        public info?: any,
    ) {}

    static pack   = (isnt: ReadyUp) =>
        isnt.info == undefined
            ? isnt.hash
            : [isnt.hash, isnt.info]

    static unpack = (hash: number | [number, any]) =>
        typeof hash == 'number'
            ? new ReadyUp(hash)
            : new ReadyUp(hash[0], hash[1])
}

register(ReadyUp)
