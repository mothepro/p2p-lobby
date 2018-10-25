import {PackableInst} from './packer'
import register from './packer'
import {PeerID} from 'ipfs'

/** This is a confirmation that a peer is in the room and contains the initial information. */
export class Introduction<T> implements PackableInst {
    constructor(public name: T) {}
    static pack<U>(inst: Introduction<U>) { return inst.name }
    static unpack<U>(name: U) { return new Introduction(name) }
}

/** The host is ready. This contains all the information about connected peers to ensure all are in sync */
export class ReadyUpInfo<T> implements PackableInst {
    constructor(public peers: Map<PeerID, T>) {}
    static pack<U>(isnt: ReadyUpInfo<U>) { return [...isnt.peers] }
    static unpack<U>(peers: [PeerID, U][]) { return new ReadyUpInfo(new Map(peers)) }
}

register(Introduction)
register(ReadyUpInfo)
