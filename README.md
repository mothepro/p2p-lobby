# P2P Lobby ([Demo](https://mothepro.github.io/p2p-lobby/demo))
A type safe lobby system built on IPFS.

## Install
```bash
$ npm i p2p-lobby
```

### Use in the browser
Bundle with browserify
```bash
$ npm run build
```

CDN
```html
<!-- Development Build -->
<script src="https://unpkg.com/p2p-lobby/dist/bundle.js"></script>

<!-- Production Build -->
<script src="https://unpkg.com/p2p-lobby/dist/bundle.min.js"></script>
```
Everything will be exposed under the global variable `p2p`.

## To be fixed
+ No guarentee that all the peers are ready once the host ready's up
  + Peers may still be introducing themselves to one another.
+ When a `peer` that is waiting in `node`'s room leaves
  + `node.peers` won't have access the `peer`'s name
  + Since `node.allPeers` still has the name, but `peer` is no longer on `node.allRooms.get(LOBBY)`

## Roadmap
+ Reduce bundled file size
  + Remove redundant deps
  + Build for multiple targets
  + Use as a libp2p package instead of ipfs wrapper
  + Use Proto instead of msgpack.
  + Upgrade to a smaller [async emitter](https://github.com/sindresorhus/emittery)
  + Use UInt8Array over Buffers
+ joinPeer should require confirmation from them

### Publishing
```shell
$ npm run release -- patch
```
