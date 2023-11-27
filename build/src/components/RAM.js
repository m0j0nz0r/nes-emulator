"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAM = void 0;
const bus_1 = require("./bus");
const addrRange = { minAddr: 0x0000, maxAddr: 0x1fff };
class RAM {
    constructor(bus) {
        this._bus = bus;
        this._ram = [];
    }
    clock() {
        // make sure we are on our addressable space.
        if (this._bus.addr < addrRange.minAddr || this._bus.addr > addrRange.maxAddr) {
            return;
        }
        // Mirroring: we have 2kb of ram which we mirror over the 8kb addressable range.
        const addr = this._bus.addr & 0x7ff;
        if (this._bus.rwFlag = bus_1.ReadFlagState.write) {
            // if bus is writing, save to ram. Make sure we only write a single byte
            this._ram[addr] = this._bus.data & 0x00ff;
        }
        else {
            // if bus is reading, write to bus.
            // if the address space is undefined, we write 0 to the bus.
            this._bus.data = this._ram[addr] || 0;
        }
    }
}
exports.RAM = RAM;
//# sourceMappingURL=RAM.js.map