const messagesList = document.getElementById('messages')! as HTMLUListElement
let lastLogTime = Date.now()

const htmlSafe = (str: string) => str.replace('<', '&lt;').replace('>', '&gt;')

export default function log(...args: any[]) {
    const li = document.createElement('li')
    li.className = 'list-group-item'

    let str: string[] = []
    for(const arg of args) {
        if (typeof arg == 'string')
            str.push(htmlSafe(arg))

        else if (arg instanceof Error) {
            li.className += ' list-group-item-danger'
            str.push(`<h2>${arg.name}</h2> ${arg.message} <pre>${arg.stack}</pre>`)
        }

        else
            str.push(`<pre>${JSON.stringify(arg, null, 2)}</pre>`)
    }

    li.innerHTML = str.join(' ')
    li.title = `+${Date.now() - lastLogTime}ms later @ ${Date().toString()}`
    lastLogTime = Date.now()
    messagesList.prepend(li)
}
