/// <reference path="../types/ipfs.d.ts" />
/// <reference path="../types/ipfs-repo.d.ts" />

import * as Ipfs from 'ipfs'
import {version} from '../../package.json'
import {error} from '../config/events'

/** IPFS node */
let ipfs!: Ipfs
export default ipfs

export interface IPFSOptions {
    pkg: string
    allowSameBrowser: boolean
    repo: string
    Swarm: string[]
}

/**
 * Creates a new instance of IFPS.
 * Should only be done once in a browser.
 */
export function makeIPFS({
        pkg = '',
        allowSameBrowser = false,
        repo = `/tmp/p2p-lobby/${version}/${pkg}${
            allowSameBrowser ? '/' + Math.random().toString().substr(2) : ''}`,
        Swarm = ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'],
    }: Partial<IPFSOptions> = {}) {
    ipfs = new Ipfs({
        repo,
        start: false,
        config: {Addresses: {Swarm}},
        EXPERIMENTAL: {pubsub: true},
    })
    // TODO remove this
    ipfs.on('error', error.activate)
    return ipfs
}
