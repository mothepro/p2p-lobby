import register, {PackableInst} from '../packer'
import {name as myName, NameType} from '../config/constants'

/**
 * This is a confirmation that a peer is in the lobby.
 * Contains the initial information (the peer's name).
 */
export default class Introduction implements PackableInst {
    constructor(public name = myName) {}

    static pack   = ({name}: Introduction) => name

    static unpack = (name: NameType) => new Introduction(name)
}

register(Introduction)
