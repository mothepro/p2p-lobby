import {PackableInst} from './packer'
import register from './packer'

export class NameChange<T> implements PackableInst {
    constructor(public name: T) {}
    static pack<U>(nc: NameChange<U>) { return nc.name }
    static unpack<U>(name: U) { return new NameChange(name) }
}

export class RoomChange<T> implements PackableInst {
    constructor(public roomID: string, public name: T) {}
    static pack<U>(nc: RoomChange<U>) { return [nc.roomID, nc.name] }
    static unpack<U>([roomID, name]: [string, U]) { return new RoomChange(roomID, name) }
}

register(NameChange)
register(RoomChange)
