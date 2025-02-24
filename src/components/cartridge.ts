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
    private _prgRom?: RAM;
    private _handleGraphicsBus() {
    }
    private _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }

        // We have 8 instructions mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr;
    }

    private _headers?: Headers;
    public clock() {
        this._trainer?.clock();
        this._prgRom?.clock();
        this._handleMainBus();
        this._handleGraphicsBus();
    }
    public load(rom: Buffer) {
        let offset = 16;
        this._headers = new Headers(rom);
        const hasTrainer = this._headers.flags6.hasTrainer;

        if (hasTrainer) {
            this._trainer = new RAM(this._mainBus, rom.subarray(offset, offset + 511), {minAddr: 0x7000, maxAddr: 0x71ff})
            offset += 512;
        }

        // load PRG_ROM
        this._prgRom = new RAM(
            this._mainBus,
            rom.subarray(offset, this._headers.prgRomSize),
            {minAddr: 0x8000, maxAddr: 0xffff},
            this._headers.prgRomSize > 0x4000 ? 0x7fff : 0x3fff
        );
        
        offset += this._headers.prgRomSize;

        // load CHR_ROM
        if (this._headers.chrRomSize) {
            const chrRom = rom.subarray(offset, this._headers.chrRomSize);
            offset += this._headers.chrRomSize;    
        }

        // load misc rom
        if (offset !== rom.byteLength) {
            const misc =  rom.subarray(offset, rom.byteLength);
        }
    }
}