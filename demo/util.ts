const messagesList = document.getElementById('messages')! as HTMLUListElement
let lastLogTime = Date.now()

export function log(...args: any[]) {
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
