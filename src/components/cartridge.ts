import { RAM } from "./RAM";
import { Bus } from "./bus";
import { Headers } from "./cartridge/headers";

const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff};

export class Cartridge {
    constructor (mainBus: Bus, graphicsBus: Bus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    private _mainBus: Bus;
    private _graphicsBus: Bus;
    private _trainer?: RAM;
    private _handleGraphicsBus() {
        throw new Error("Method not implemented.");
    }
    private _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }

        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr;
    }

    private _headers?: Headers;
    public clock() {
        this._trainer?.clock();
        this._handleMainBus();
        this._handleGraphicsBus();
    }
    public load(rom: Buffer) {
        this._headers = new Headers(rom);
        const hasTrainer = this._headers.flags6.hasTrainer;

        if (hasTrainer) {
            this._trainer = new RAM(this._mainBus, rom.subarray(16, 16 + 511), {minAddr: 0x7000, maxAddr: 0x71ff})
        }
    }
}