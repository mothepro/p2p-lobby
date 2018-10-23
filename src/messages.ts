import {PackableInst} from './packer'
import register from './packer'
import {PeerID} from 'ipfs'

/** This is also a confirmation that a peer is in the room and contains the initial information. */
export class NameChange<T> implements PackableInst {
    constructor(public name: T) {}
    static pack<U>(inst: NameChange<U>) { return inst.name }
    static unpack<U>(name: U) { return new NameChange(name) }
}

/** A notification that a peer will be changing rooms and contains their initial information. */
export class RoomChange<T> implements PackableInst {
    constructor(public roomID: string, public name: T) {}
    static pack<U>(inst: RoomChange<U>) { return [inst.roomID, inst.name] }
    static unpack<U>([roomID, name]: [string, U]) { return new RoomChange(roomID, name) }
}

/** The host is ready. This contains all the information about connected peers to ensure all are in sync */
export class ReadyUpInfo<T> implements PackableInst {
    constructor(public peers: Map<PeerID, T>) {}
    static pack<U>(isnt: ReadyUpInfo<U>) { return [...isnt.peers] }
    static unpack<U>(peers: [PeerID, U][]) { return new ReadyUpInfo(new Map(peers)) }
}

register(NameChange)
register(RoomChange)
register(ReadyUpInfo)
