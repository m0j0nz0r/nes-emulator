import { Bus } from "./bus";

const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff};

export class PPU {
    constructor (mainBus: Bus, graphicsBus: Bus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    private _mainBus: Bus;
    private _graphicsBus: Bus;
    private _handleMainBus(){
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }

        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr & 0x7;
        const data = this._mainBus.data & 0xff;
    };

    public clock() {
        this._handleMainBus();
    }

}