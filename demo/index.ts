import P2P, {EventNames} from '..'
import {name as pkgName, version as pkgVersion} from '../package.json'

const lobbyBtn = document.getElementById('joinLobby')! as HTMLButtonElement
const messagesList = document.getElementById('messages')! as HTMLUListElement
let lastLogTime = Date.now()

function log(...args: any[]) {
    const li = document.createElement('li')
    let str: string[] = []
    for(const arg of args) {
        if (typeof arg == 'string')
            str.push(arg)

        else if (arg instanceof Error)
            str.push(`<b>ERROR ${arg.name}</b> ${arg.message} <pre>${arg.stack}</pre>`)

        else
            str.push(`<pre>${JSON.stringify(arg, null, 2)}</pre>`)
    }
    li.innerHTML = str.join(' ')
    li.title = `+${Date.now() - lastLogTime}ms later @ ${Date().toString()}`
    lastLogTime = Date.now()
    messagesList.appendChild(li)
}

lobbyBtn.addEventListener('click', async e => {
    const input = document.getElementById('name')! as HTMLInputElement
    if(!input.value.trim())
        return

    lobbyBtn.disabled = true
    log('Creating Node')
    const node = new P2P(input.value.trim(), `my-demo-${pkgName}@${pkgVersion}`)
    node.on(EventNames.error, log)
    node.on(EventNames.peerJoin, peerID => log(`Welcome ${node.peers.get(peerID)}`))
    node.on(EventNames.peerLeft, peerID => log(`See ya ${node.peers.get(peerID)}`))
    log('Node created', 'Joining Lobby')
    await node.joinLobby()
    log(`In lobby [${node.name}]`)
})

log('All entries are logged here')