import {buildError} from '../config/errors'
import disconnect, {leave, leaveRoom} from './disconnect'
import connect from './connect'
import ipfs from './ipfs'
import {ConnectionStatus, inGroup, LOBBY_ID, setInLobby, setStatus, status} from '../config/constants'
import {disconnected, groupReadyInit, lobbyConnect} from '../config/events'
import listener from './listener'


export default async function({
    // How often to check for new peers
    pollInterval = 2 * 1000,
    // Max time to wait before being kicked
    maxIdle = 0,
} = {}) {
    if (status != ConnectionStatus.JOINING) {
        try {
            setStatus(ConnectionStatus.JOINING)
            await leaveRoom()
            await connect()
            await ipfs.pubsub.subscribe(LOBBY_ID, listener, { discover: true })

            lobbyConnect.activate()
            setStatus(ConnectionStatus.IN_LOBBY)
            pollLobby()

            // Disconnect peers idling in lobby
            if (maxIdle) {
                const handle = setTimeout(() => !inGroup() && disconnect(), maxIdle)
                const stopIdleCountdown = () => clearTimeout(handle)
                disconnected.once(stopIdleCountdown)
                groupReadyInit.once(stopIdleCountdown as any) // not sure why this doesn't work??
            }
        } catch (e) {
            lobbyConnect.deactivate(buildError(e))
        }
    }

    return lobbyConnect.previous
}
