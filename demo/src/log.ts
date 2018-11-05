const messagesList = document.getElementById('messages')! as HTMLUListElement
let lastLogTime = Date.now()

export default function log(...args: any[]) {
    const li = document.createElement('li')
    li.className = 'list-group-item d-flex justify-content-between'

    let str: string[] = []
    for(const arg of args) {
        if (typeof arg == 'string')
            str.push(arg)

        else if (arg instanceof Error) {
            li.className += ' list-group-item-danger'
            str.push(`<h2>${arg.name}</h2> ${arg.message}<br>${
                Object.keys(arg).length
                    ? `Error Props<pre>${JSON.stringify({...arg}, null, 2)}</pre>` : ''
            }<br><pre>${arg.stack}</pre>`)
        }

        else if (typeof arg == 'number' || typeof arg == 'boolean')
            str.push(`<code>${arg}</code>`)

        else
            str.push(`<pre>${JSON.stringify(arg, null, 2)}</pre>`)
    }

    const timeBetween = Date.now() - lastLogTime
    li.innerHTML = `<div style="overflow-x: auto">${str.join(' ')}</div>
    <span class="badge badge-pill" title="${Date().toString()}">${
        timeBetween > 60 * 1000
            ? Math.floor(timeBetween / (60 * 1000)) + ' minutes '
            + Math.floor((timeBetween % (60 * 1000)) / 1000) + ' secs'
            : timeBetween > 1000
                ? Math.floor(timeBetween / 1000) + ' secs'
                : timeBetween + 'ms'
    }</span>`
    lastLogTime = Date.now()
    messagesList.prepend(li)
}
