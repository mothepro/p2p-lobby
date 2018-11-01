import {PackableInst} from './packer'
import register from './packer'
import {PeerID} from 'ipfs'

/** This is a confirmation that a peer is in the room and contains the initial information. */
export class Introduction<T> implements PackableInst {
    constructor(public name: T, public infoRequest = false) {}
    static pack<U>(inst: Introduction<U>) { return [inst.infoRequest, inst.name] }
    static unpack<U>([infoRequest, name]: [boolean, U]) { return new Introduction(name, infoRequest) }
}

/** The host is ready. This contains all the information about connected peers to ensure all are in sync */
export class ReadyUpInfo implements PackableInst {
    constructor(public peers: Set<PeerID>) {}
    static pack(isnt: ReadyUpInfo) { return [...isnt.peers] }
    static unpack(peers: PeerID[]) { return new ReadyUpInfo(new Set(peers)) }
}

register(Introduction)
register(ReadyUpInfo)
