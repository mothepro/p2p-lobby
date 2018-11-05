/* Prevent XSS */
export function htmlSafe (str: string | void | { toString(): string }) {
    if(!str)
        return ''

    const unsafeChars = new Map([
        ['&', '&amp;'],
        ['<', '&lt;'],
        ['>', '&gt;'],
        ['"', '&quot;'],
        ['\'', '&#x27;'], // &apos; not recommended because its not in the HTML spec
                          //(See: section 24.4.1) &apos; is in the XML and XHTML specs.
        ['/', '&#x2F;'],  // forward slash is included as it helps end an HTML entity
    ])

    let ret = str.toString()
    for(const [unsafe, safe] of unsafeChars)
        ret = ret.replace(new RegExp(unsafe, 'g'), safe)
    return ret
}
