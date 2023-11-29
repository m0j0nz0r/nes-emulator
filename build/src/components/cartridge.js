"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cartridge = void 0;
const RAM_1 = require("./RAM");
const headers_1 = require("./cartridge/headers");
const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };
class Cartridge {
    constructor(mainBus, graphicsBus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    _handleGraphicsBus() {
    }
    _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }
        // We have 8 instructions mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr;
    }
    clock() {
        var _a, _b;
        (_a = this._trainer) === null || _a === void 0 ? void 0 : _a.clock();
        (_b = this._prgRom) === null || _b === void 0 ? void 0 : _b.clock();
        this._handleMainBus();
        this._handleGraphicsBus();
    }
    load(rom) {
        let offset = 16;
        this._headers = new headers_1.Headers(rom);
        const hasTrainer = this._headers.flags6.hasTrainer;
        if (hasTrainer) {
            this._trainer = new RAM_1.RAM(this._mainBus, rom.subarray(offset, offset + 511), { minAddr: 0x7000, maxAddr: 0x71ff });
            offset += 512;
        }
        // load PRG_ROM
        this._prgRom = new RAM_1.RAM(this._mainBus, rom.subarray(offset, this._headers.prgRomSize), { minAddr: 0x8000, maxAddr: 0xffff }, this._headers.prgRomSize > 0x4000 ? 0x7fff : 0x3fff);
        offset += this._headers.prgRomSize;
        // load CHR_ROM
        if (this._headers.chrRomSize) {
            const chrRom = rom.subarray(offset, this._headers.chrRomSize);
            offset += this._headers.chrRomSize;
        }
        // load misc rom
        if (offset !== rom.byteLength) {
            const misc = rom.subarray(offset, rom.byteLength);
        }
    }
}
exports.Cartridge = Cartridge;
//# sourceMappingURL=cartridge.js.map