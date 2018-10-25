# P2P Lobby
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

or load from CDN

Development Build
```html
<script src="https://unpkg.com/p2p-lobby@0.0.1/dist/bundle.js"></script>
```

Production Build
```html
<script src="https://unpkg.com/p2p-lobby@0.0.1/dist/bundle.min.js"></script>
```

## Usage
See demo

## Roadmap
+ Reduce bundled file size
 + Remove redundant deps
 + Build for multiple targets
 + Use as a libp2p package instead of ipfs wrapper
 + Use Proto instead of msgpack.
 + Upgrade to a smaller [async emitter](https://github.com/sindresorhus/emittery)
 + Use UInt8Array over Buffers
