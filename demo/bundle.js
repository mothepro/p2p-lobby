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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var __1 = (typeof window !== "undefined" ? window['p2p'] : typeof global !== "undefined" ? global['p2p'] : null);
var lobbyConnect_1 = require("./src/lobbyConnect");
var myRoomConnect_1 = require("./src/myRoomConnect");
var package_json_1 = require("../package.json");
var log_1 = require("./src/log");
var messages_1 = require("./src/messages");
var util_1 = require("./src/util");
var node;
var app = document.getElementById('app');
// Join Lobby button is pressed
var lobbyForm = document.getElementById('joinLobby'), nameInput = document.getElementById('name');
lobbyForm.addEventListener('submit', function (e) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                e.preventDefault();
                app.removeChild(lobbyForm);
                log_1.default('Creating Node');
                node = createNode(nameInput.value.trim());
                log_1.default('Joining Lobby');
                return [4 /*yield*/, node.joinLobby()];
            case 1:
                _a.sent();
                log_1.default(util_1.htmlSafe(node.name), 'is in the lobby');
                return [2 /*return*/];
        }
    });
}); });
// Sending a message
var chatbox = document.getElementById('chatbox'), chatForm = document.getElementById('chatForm'), dataInput = document.getElementById('data');
chatForm.addEventListener('submit', function (e) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                e.preventDefault();
                log_1.default('Attempting to broadcast:', util_1.htmlSafe(dataInput.value.trim()));
                return [4 /*yield*/, node.broadcast(dataInput.value.trim())];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
// Click Request Random Int
var randInt = document.getElementById('randInt');
randInt.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, node.broadcast(new messages_1.RandomRequest(true))];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); });
// Click Request Random Float
var randFloat = document.getElementById('randFloat');
randFloat.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, node.broadcast(new messages_1.RandomRequest(false))];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); });
// Click disconnect
var disconnect = document.getElementById('disconnect');
disconnect.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, node.disconnect()];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); });
/** Creates a new P2P node binds its events */
var lc = function (arg) { return lobbyConnect_1.default(node, arg); }, mc = function (arg) { return myRoomConnect_1.default(node, arg); };
function createNode(name) {
    var node = new __1.default(name, "my-demo-" + package_json_1.name + "@" + package_json_1.version, {
        allowSameBrowser: true,
    });
    document.title += " \u2022 " + name;
    node.on(0 /* error */, log_1.default);
    node.on(3 /* connected */, function () { return log_1.default('Node connected'); });
    node.on(4 /* disconnected */, function () { return log_1.default('Node disconnected'); });
    node.on(5 /* peerJoin */, function (peer) { return log_1.default('Welcome', util_1.htmlSafe(node.peers.get(peer))); });
    node.on(6 /* peerLeft */, function (peer) { return log_1.default('See ya', util_1.htmlSafe(node.peers.get(peer))); });
    node.on(10 /* lobbyChange */, lc);
    node.on(13 /* meChange */, mc);
    // Show chat box and clear peer lists for new peers
    var peerList = document.getElementById('my-peers');
    node.on(2 /* roomReady */, function () {
        var e_1, _a;
        node.removeListener(10 /* lobbyChange */, lc);
        node.removeListener(13 /* meChange */, mc);
        log_1.default('Room ready');
        app.removeChild(document.getElementById('lobby-peers'));
        chatbox.style.display = 'block';
        peerList.innerHTML = '';
        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-primary';
        li.innerHTML = 'List of peers connected to this room';
        peerList.appendChild(li);
        try {
            for (var _b = __values(node.peers), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), peerId = _d[0], name_1 = _d[1];
                var li_1 = document.createElement('li');
                li_1.className = 'list-group-item';
                li_1.innerHTML = util_1.htmlSafe(name_1);
                li_1.id = peerId;
                peerList.appendChild(li_1);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
    // Incoming messages
    node.on(1 /* data */, function (_a) {
        var peer = _a.peer, data = _a.data;
        var peerName = util_1.htmlSafe(node.peers.has(peer) ? node.peers.get(peer) : node.name);
        if (data instanceof messages_1.RandomRequest) {
            var rand = data.isInt ? node.randomUInt(100) : node.random();
            log_1.default(peerName, 'made the random number', rand);
        }
        else if (typeof data == 'string')
            log_1.default(peerName, 'says', util_1.htmlSafe(data));
        else {
            var err = Error('A peer has sent some unexpected data');
            err.peerID = peer;
            err.data = data;
            log_1.default(err);
        }
    });
    return node;
}
log_1.default('All entries are logged here');

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../package.json":7,"./src/lobbyConnect":2,"./src/log":3,"./src/messages":4,"./src/myRoomConnect":5,"./src/util":6}],2:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("./log");
var util_1 = require("./util");
var myRoomConnect_1 = require("./myRoomConnect");
var peerList = document.getElementById('lobby-peers');
/** This is triggered when someone joines the lobby */
function lobbyConnect(node, _a) {
    var _this = this;
    var peer = _a.peer, joined = _a.joined;
    var peerName = util_1.htmlSafe(node.peers.get(peer));
    if (joined) {
        log_1.default('Welcome to the lobby ', peerName);
        if (peerList.childNodes.length == 0) { // Add title
            var li_1 = document.createElement('li');
            li_1.className = 'list-group-item list-group-item-primary d-flex justify-content-between';
            li_1.innerHTML = 'Peers in the Lobby';
            peerList.appendChild(li_1);
        }
        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action d-flex align-items-center justify-content-between';
        li.innerHTML = peerName;
        li.id = "lobby-" + peer;
        if (node.isLobby && !myRoomConnect_1.hasPeers) {
            var joinBtn_1 = document.createElement('button');
            joinBtn_1.className = 'btn btn-outline-secondary joinBtn';
            joinBtn_1.innerHTML = 'Join';
            joinBtn_1.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            log_1.default('Attempting to join', peerName);
                            joinBtn_1.disabled = true;
                            return [4 /*yield*/, node.joinPeer(peer)];
                        case 1:
                            _a.sent();
                            peerList.innerHTML = ''; // we don't know about the lobby anymore
                            log_1.default("Now waiting in " + peerName + "'s room");
                            return [2 /*return*/];
                    }
                });
            }); });
            li.appendChild(joinBtn_1);
        }
        peerList.appendChild(li);
    }
    else {
        log_1.default(peerName, 'has left the lobby');
        peerList.removeChild(document.getElementById("lobby-" + peer));
        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0]);
    }
}
exports.default = lobbyConnect;

},{"./log":3,"./myRoomConnect":5,"./util":6}],3:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    li.className = 'list-group-item d-flex justify-content-between';
    var str = [];
    try {
        for (var args_1 = __values(args), args_1_1 = args_1.next(); !args_1_1.done; args_1_1 = args_1.next()) {
            var arg = args_1_1.value;
            if (typeof arg == 'string')
                str.push(arg);
            else if (arg instanceof Error) {
                li.className += ' list-group-item-danger';
                str.push("<h2>" + arg.name + "</h2> " + arg.message + "<br>" + (Object.keys(arg).length
                    ? "Error Props<pre>" + JSON.stringify(__assign({}, arg), null, 2) + "</pre>" : '') + "<br><pre>" + arg.stack + "</pre>");
            }
            else if (typeof arg == 'number')
                str.push("<code>" + arg + "</code>");
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
    var timeBetween = Date.now() - lastLogTime;
    li.innerHTML = "<div style=\"overflow-x: auto\">" + str.join(' ') + "</div>\n    <span class=\"badge badge-pill\" title=\"" + Date().toString() + "\">" + (timeBetween > 60 * 1000
        ? Math.floor(timeBetween / (60 * 1000)) + ' minutes '
            + Math.floor((timeBetween % (60 * 1000)) / 1000) + ' secs'
        : timeBetween > 1000
            ? Math.floor(timeBetween / 1000) + ' secs'
            : timeBetween + 'ms') + "</span>";
    lastLogTime = Date.now();
    messagesList.prepend(li);
}
exports.default = log;

},{}],4:[function(require,module,exports){
(function (global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Sometimes browserify-shim doesn't know to replace "../.." with `window.p2p`. */
var __1 = (typeof window !== "undefined" ? window['p2p'] : typeof global !== "undefined" ? global['p2p'] : null);
/** Generate a random number [int or float] that matches all the other peer's number. */
var RandomRequest = /** @class */ (function () {
    function RandomRequest(isInt) {
        this.isInt = isInt;
    }
    RandomRequest.pack = function (inst) { return inst.isInt; };
    RandomRequest.unpack = function (isInt) { return new RandomRequest(isInt); };
    return RandomRequest;
}());
exports.RandomRequest = RandomRequest;
__1.Packer(RandomRequest);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("./log");
var util_1 = require("./util");
var peerList = document.getElementById('my-peers');
var numPeersWaiting = 0;
function hasPeers() {
    return !!numPeersWaiting;
}
exports.hasPeers = hasPeers;
/** This is triggered when someone joines my room */
function myRoomConnect(node, _a) {
    var _this = this;
    var peer = _a.peer, joined = _a.joined;
    var peerName = util_1.htmlSafe(node.peers.get(peer));
    if (joined) {
        numPeersWaiting++;
        log_1.default(peerName, 'has joined our room');
        // can't join others if someone is waiting on me
        document.querySelectorAll('.joinBtn').forEach(function (btn) { return btn.remove(); });
        if (peerList.childNodes.length == 0) { // Add title
            var li_1 = document.createElement('li');
            li_1.className = 'list-group-item list-group-item-primary d-flex align-items-center justify-content-between';
            li_1.innerHTML = 'List of peers connected our room';
            var readyBtn_1 = document.createElement('button');
            readyBtn_1.className = 'btn btn-outline-primary';
            readyBtn_1.innerHTML = 'Ready Up';
            readyBtn_1.addEventListener('click', function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            readyBtn_1.disabled = true;
                            log_1.default('Attempting ready the room');
                            return [4 /*yield*/, node.readyUp()];
                        case 1:
                            _a.sent();
                            log_1.default('Room is ready with ', node.peers.size, 'peers');
                            return [2 /*return*/];
                    }
                });
            }); });
            li_1.appendChild(readyBtn_1);
            peerList.appendChild(li_1);
        }
        var li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.innerHTML = peerName;
        li.id = "mine-" + peer;
        peerList.appendChild(li);
    }
    else {
        numPeersWaiting--;
        log_1.default(peerName, 'has left our room');
        peerList.removeChild(document.getElementById("mine-" + peer));
        if (peerList.children.length == 1) // Remove title
            peerList.removeChild(peerList.children[0]);
    }
}
exports.default = myRoomConnect;

},{"./log":3,"./util":6}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Prevent XSS */
function htmlSafe(str) {
    if (str)
        return str.toString().replace('<', '&lt;').replace('>', '&gt;');
    return '';
}
exports.htmlSafe = htmlSafe;

},{}],7:[function(require,module,exports){
module.exports={
  "name": "p2p-lobby",
  "version": "0.0.9",
  "description": "A type safe lobby system built on IPFS",
  "scripts": {
    "build:dev": "simplifyify index.ts -s p2p -o dist/bundle.js --debug --bundle",
    "build:prod": "simplifyify index.ts -s p2p -o dist/bundle.js --minify",
    "build:demo": "simplifyify demo/index.ts -o demo/bundle.js --debug --bundle",
    "build": "simplifyify index.ts -s p2p -o dist/bundle.js --debug --bundle --minify",
    "test": "ts-mocha test/*.test.ts",
    "prepare": "npm test && rimraf dist/package.json",
    "release": "npm run build && npm run build:demo && np"
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
    "@types/should": "^13.0.0",
    "browserify": "^16.2.3",
    "browserify-shim": "^3.8.14",
    "mocha": "^5.2.0",
    "np": "^3.0.4",
    "rimraf": "^2.6.2",
    "should": "^13.2.3",
    "simplifyify": "^7.0.0",
    "strict-event-emitter-types": "^2.0.0",
    "ts-mocha": "^2.0.0",
    "typescript": "^3.1.1"
  },
  "browserify": {
    "transform": [
      "browserify-shim"
    ],
    "paths": [
      "./demo"
    ]
  },
  "browserify-shim": {
    "..": "global:p2p",
    "../..": "global:p2p"
  }
}

},{}]},{},[1])
//# sourceMappingURL=bundle.js.map
