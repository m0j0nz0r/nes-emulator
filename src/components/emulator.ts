import { Bus } from './bus';
import { RAM } from './RAM';
import { nes6502 } from './nes6502';
import { Cartridge } from './cartridge';
import { PPU } from './ppu';
import { EventHandler, Logger } from './eventHandler';
export class Emulator extends EventHandler {
    constructor (logger: Logger = console) {
        super(logger);
        this._bus = new Bus();
        this._graphicBus = new Bus();
        this._ram = new RAM(this._bus);
        this._cpu = new nes6502(this._bus, logger);
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

    public start() {
        this._cpu.pc = 0xc000;
        this._bus.read(this._cpu.pc);
        this._emulation = setInterval(() => this.clock(), 1000/this._cpu.clockSpeed)
    }
    public stop() {
        clearTimeout(this._emulation);
    }
    public clock () {
        try {
            this._ram.clock();
            this._cartridge.clock();
            this._cpu.clock();
            this._ppu.clock();
    
        } catch(e) {
            this._cpu.microCodeStack.push(() => {
                this._bus.read(0x2);
            });
            this._cpu.microCodeStack.push(() => {
                this.logger.log('Error 1: ', this._bus.data.toString(16));
                this._bus.read(0x3);
            });
            this._cpu.microCodeStack.push(() => {
                this.logger.log('Error 2: ', this._bus.data.toString(16));
                this.stop();
            });
        }
    }
    public loadCartridge(rom: Buffer) {
        this._cartridge?.load(rom);
    }
}