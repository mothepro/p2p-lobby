/** Returns a Promise which resolves after `ms` milliseconds. */
export default async (ms: number) => new Promise(r => setTimeout(r, ms))
