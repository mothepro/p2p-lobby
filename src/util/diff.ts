import {PeerID} from 'ipfs'

/** Finds peers who just joined from old and new sets of the IDs. */
export const peersJoined = (oldIDs: Set<PeerID>, newIDs: Set<PeerID>) =>
    [...newIDs].filter(peer => !oldIDs.has(peer))

/** Finds peers who just left from old and new sets of the IDs. */
export const peersLeft = (oldIDs: Set<PeerID>, newIDs: Set<PeerID>) =>
    [...oldIDs].filter(peer => !newIDs.has(peer))
