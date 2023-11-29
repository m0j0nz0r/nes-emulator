"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bus = exports.ReadFlagState = void 0;
var ReadFlagState;
(function (ReadFlagState) {
    ReadFlagState[ReadFlagState["read"] = 1] = "read";
    ReadFlagState[ReadFlagState["write"] = 0] = "write";
})(ReadFlagState || (exports.ReadFlagState = ReadFlagState = {}));
class Bus {
    constructor() {
        this.rwFlag = ReadFlagState.read;
        this._addr = 0;
        this.data = 0;
    }
    set addr(value) {
        this._addr = value & 0xffff;
    }
    get addr() {
        return this._addr;
    }
    read(addr) {
        this._addr = addr;
        this.rwFlag = ReadFlagState.read;
    }
    write(addr, data) {
        this._addr = addr;
        this.data = data;
        this.rwFlag = ReadFlagState.write;
    }
}
exports.Bus = Bus;
//# sourceMappingURL=bus.js.map