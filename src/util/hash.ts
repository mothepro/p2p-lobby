import {PeerID} from 'ipfs'
import {groupPeerIDs, id} from '../config/constants'

// Alphabet of Base58 characters used in peer id's
const ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Generates a number based on a list of strings. */
function hash(peerIDs: PeerID[]) {
    let allIdHash = 1
    let idHash

    for (const id of peerIDs.sort()) {
        idHash = 0
        for (let i = 0; i < id.length; i++)
            idHash += (ALPHABET.indexOf(id[i]) + 1) * (ALPHABET.length * i + 1)
        allIdHash *= idHash
        allIdHash %= 0xFFFFFFFF
    }

    return allIdHash - 0x7FFFFFFF
}

/**
 * Generates a number based on the peers connected to the current room.
 * Meaning this value should be consistent with all other peers as well.
 */
export default () => hash([...groupPeerIDs(), id])
