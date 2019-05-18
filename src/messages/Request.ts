import {PeerID} from 'ipfs'
import register, {PackableInst} from '../packer'

/** Confirm membership to a group or request a leader to join their group. */
export default class Request implements PackableInst {
    constructor(
        public leader: PeerID,
    ) {}

    static pack   = ({leader}: Request) => leader

    static unpack = (leader: string) => new Request(leader)
}

register(Request)
