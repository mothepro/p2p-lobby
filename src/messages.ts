import register, {PackableInst} from './packer'
import {PeerID} from 'ipfs'

/**
 * This is a confirmation that a peer is in the lobby.
 * Contains the initial information (usually the peer's name), as well as their group leader.
 * This should be resent whenever groups change.
 */
export class Introduction<T> implements PackableInst {
    constructor(
        public name: T,
        public leader: PeerID = '',
        public infoRequest = false
    ) {}

    static pack   = <U>(inst: Introduction<U>) =>
        [inst.infoRequest, inst.name, inst.leader]

    static unpack = <U>([infoRequest, name, leader]: [boolean, U, PeerID]) =>
        new Introduction(name, leader, infoRequest)
}

/**
 * The group leader is ready to start.
 * This contains all the information about connected peers to ensure all the right peers join.
 * And that they know each other when in room.
 */
export class ReadyUpInfo<T> implements PackableInst {
    constructor(public hash: number, public info?: T) {}

    static pack   = <U>(isnt: ReadyUpInfo<U>) =>
        isnt.info == undefined
            ? isnt.hash
            : [isnt.hash, isnt.info]

    static unpack = <U>(hash: number | [number, U]) =>
        typeof hash == 'number'
            ? new ReadyUpInfo(hash)
            : new ReadyUpInfo(hash[0], hash[1])
}

register(Introduction)
register(ReadyUpInfo)
