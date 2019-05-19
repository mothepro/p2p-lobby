import register, {PackableInst} from '../packer'
import {NameType} from '../config/constants'

/**
 * This is a confirmation that a peer is in the lobby.
 * Contains the initial information (the peer's name).
 */
export default class Introduction implements PackableInst {
    constructor(
        public name: NameType,
        public infoRequest = false,
    ) {}

    static pack   = ({name, infoRequest}: Introduction) =>
        [infoRequest, name]

    static unpack = ([infoRequest, name]: [boolean, NameType]) =>
        new Introduction(name, infoRequest)
}

register(Introduction)
