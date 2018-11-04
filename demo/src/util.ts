/* Prevent XSS */
export function htmlSafe (str: string | void | { toString(): string }) {
    if(str)
        return str.toString().replace('<', '&lt;').replace('>', '&gt;')
    return ''
}
