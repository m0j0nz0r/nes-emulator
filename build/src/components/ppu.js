"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PPU = void 0;
const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };
class PPU {
    constructor(mainBus, graphicsBus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }
        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr & 0x7;
        const data = this._mainBus.data & 0xff;
    }
    ;
    clock() {
        this._handleMainBus();
    }
}
exports.PPU = PPU;
//# sourceMappingURL=ppu.js.map