(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = (typeof window !== "undefined" ? window['p2p'] : typeof global !== "undefined" ? global['p2p'] : null);
var package_json_1 = require("../package.json");
var util_1 = require("./util");
var lobbyBtn = document.getElementById('joinLobby');
lobbyBtn.addEventListener('click', function (e) { return __awaiter(_this, void 0, void 0, function () {
    var input, node;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                input = document.getElementById('name');
                if (input.value.trim().length < 2)
                    return [2 /*return*/];
                lobbyBtn.disabled = true;
                util_1.log('Creating Node');
                node = new __1.default(input.value.trim(), "my-demo-" + package_json_1.name + "@" + package_json_1.version, { appendDateToDefaultRepo: true });
                node.on(0 /* error */, util_1.log);
                node.on(3 /* peerJoin */, function (peerID) { return util_1.log("Welcome " + node.peers.get(peerID)); });
                node.on(4 /* peerLeft */, function (peerID) { return util_1.log("See ya " + node.peers.get(peerID)); });
                util_1.log('Joining Lobby');
                return [4 /*yield*/, node.joinLobby()];
            case 1:
                _a.sent();
                util_1.log(node.name, 'is in the lobby');
                return [2 /*return*/];
        }
    });
}); });
util_1.log('All entries are logged here');
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../package.json":3,"./util":2}],2:[function(require,module,exports){
"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var messagesList = document.getElementById('messages');
var lastLogTime = Date.now();
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var e_1, _a;
    var li = document.createElement('li');
    var str = [];
    try {
        for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
            var arg = args_1_1.value;
            if (typeof arg == 'string')
                str.push(arg);
            else if (arg instanceof Error)
                str.push("<b>ERROR " + arg.name + "</b> " + arg.message + " <pre>" + arg.stack + "</pre>");
            else
                str.push("<pre>" + JSON.stringify(arg, null, 2) + "</pre>");
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (args_1_1 && !args_1_1.done && (_a = args_1.return)) _a.call(args_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    li.innerHTML = str.join(' ');
    li.title = "+" + (Date.now() - lastLogTime) + "ms later @ " + Date().toString();
    lastLogTime = Date.now();
    messagesList.appendChild(li);
}
exports.log = log;
},{}],3:[function(require,module,exports){
module.exports={
  "name": "p2p-lobby",
  "version": "0.0.2",
  "description": "A type safe lobby system built on IPFS",
  "scripts": {
    "bundle":       "simplifyify index.ts -s p2p -o dist/bundle.js --debug --bundle",
    "optimize":     "simplifyify index.ts -s p2p -o dist/bundle.js --minify",
    "build":        "simplifyify index.ts -s p2p -o dist/bundle.js --debug --bundle --minify",
    "demo":         "simplifyify demo/index.ts   -o demo/bundle.js --debug --bundle",
    "test":         "ts-mocha test/**/*.ts"
  },
  "files": [
    "dist/"
  ],
  "dependencies": {
    "ipfs": "^0.32.3",
    "ipfs-repo": "^0.24.0",
    "msgpack-lite": "^0.1.26"
  },
  "devDependencies": {
    "@types/events": "^1.2.0",
    "@types/mocha": "^5.2.5",
    "@types/msgpack-lite": "^0.1.6",
    "@types/node": "^10.11.4",
    "browserify": "^16.2.3",
    "browserify-shim": "^3.8.14",
    "mocha": "^5.2.0",
    "should": "^13.2.3",
    "simplifyify": "^7.0.0",
    "strict-event-emitter-types": "^2.0.0",
    "ts-mocha": "^2.0.0",
    "typescript": "^3.1.1"
  },
  "browserify": {
    "transform": [
      "browserify-shim"
    ]
  },
  "browserify-shim": {
    "..": "global:p2p"
  }
}

},{}]},{},[1])
//# sourceMappingURL=bundle.js.map
