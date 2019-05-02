import ipfs from './ipfs'
import {connected} from '../config/events'
import {ConnectionStatus, setId, setStatus, status} from '../config/constants'

// This should enable OFFLINE -> READY in same block
ipfs.on('ready', () => setStatus(ConnectionStatus.READY))
connected.onContinueAfterError(() => setStatus(ConnectionStatus.ONLINE))

/**
 * Connect P2P Node it to the IPFS network.
 * NOOP if node is already connected, returns the result of the last attempt.
 */
export default async function () {
    try {
        // go online if not already
        if (status == ConnectionStatus.OFFLINE)
            await new Promise((resolve, reject) => {
                ipfs.once('ready', resolve)
                ipfs.once('error', reject)
            })

        // Grab an id and start node if haven't already
        if (status == ConnectionStatus.READY) {
            setStatus(ConnectionStatus.CONNECTING)
            await ipfs.start()
            const { id } = await ipfs.id()
            setId(id)
            connected.activate()
        }
    } catch (e) {
        connected.deactivate(e)
    }
    return connected.previous
}
