import { RAM } from "./RAM";
import { Bus } from "./bus";
import { Headers } from "./cartridge/headers";

const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };

export class Cartridge {
    constructor(mainBus: Bus, graphicsBus: Bus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    private _mainBus: Bus;
    private _graphicsBus: Bus;
    private _trainer?: RAM;
    private _prgRom?: RAM;
    private _chrRom?: RAM;
    private _miscRom?: RAM;
    private _handleGraphicsBus() {
    }

    private _headers?: Headers;
    public clock() {
        this._trainer?.clock();
        this._prgRom?.clock();
        this._chrRom?.clock();
        this._miscRom?.clock();
        this._handleGraphicsBus();
    }
    public load(rom: Buffer) {
        let offset = 16;
        this._headers = new Headers(rom);
        const hasTrainer = this._headers.flags6.hasTrainer;

        if (hasTrainer) {
            this._trainer = new RAM(this._mainBus, rom.subarray(offset, offset + 511), { minAddr: 0x7000, maxAddr: 0x71ff })
            offset += 512;
        }

        // load PRG_ROM
        this._prgRom = new RAM(
            this._mainBus,
            rom.subarray(offset, this._headers.prgRomSize),
            { minAddr: 0x8000, maxAddr: 0xffff },
            this._headers.prgRomSize > 0x4000 ? 0x7fff : 0x3fff
        );

        offset += this._headers.prgRomSize;

        // load CHR_ROM
        if (this._headers.chrRomSize) {
            const chrRom = rom.subarray(offset, this._headers.chrRomSize);
            offset += this._headers.chrRomSize;

            this._chrRom = new RAM(
                this._graphicsBus,
                chrRom,
                { minAddr: 0x0000, maxAddr: 0x1fff },
                this._headers.chrRomSize > 0x2000 ? 0x1fff : 0xfff
            );
        }

        // load misc rom
        if (offset !== rom.byteLength) {
            const misc = rom.subarray(offset, rom.byteLength);
            this._miscRom = new RAM(
                this._mainBus,
                misc,
                { minAddr: 0x6000, maxAddr: 0x7fff },
                misc.byteLength > 0x2000 ? 0x1fff : misc.byteLength - 1
            );
        }
    }
}