import {PeerID} from 'ipfs'
import register, {PackableInst} from '../packer'

/** Leader of a group invites a member to their group or confirm membership their group. */
export default class Invite implements PackableInst {
    constructor(
        public members: Set<PeerID>,
    ) {}

    static pack   = ({members}: Invite) => [...members]

    static unpack = (members: PeerID[]) => new Invite(new Set(members))
}

register(Invite)
