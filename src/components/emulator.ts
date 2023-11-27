import { Bus } from './bus';
import { RAM } from './RAM';
import { nes6502 } from './nes6502';
import { Cartridge } from './cartridge';
import { PPU } from './ppu';

export class Emulator {
    constructor () {
        this._bus = new Bus();
        this._graphicBus = new Bus();
        this._ram = new RAM(this._bus);
        this._cpu = new nes6502(this._bus);
        this._cartridge = new Cartridge(this._bus, this._graphicBus);
        this._ppu = new PPU(this._bus, this._graphicBus);
    }
    private _bus: Bus;
    private _graphicBus: Bus;
    private _ram: RAM;
    private _cpu: nes6502;
    private _ppu: PPU;
    private _cartridge: Cartridge;
    private _emulation?: NodeJS.Timeout;

    private start() {
        this._emulation = setInterval(() => this.clock(), 1000/this._cpu.clockSpeed)
    }
    private stop() {
        clearTimeout(this._emulation);
    }
    public clock () {
        this._ram.clock();
        this._cartridge.clock();
        this._cpu.clock();
        this._ppu.clock();
    }
    public loadCartridge(rom: Buffer) {
        this._cartridge?.load(rom);
    }
}