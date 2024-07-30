import * as NanoTimer from 'nanotimer';
import { Bus } from './bus';
import { RAM } from './RAM';
import { nes6502 } from './nes6502';
import { Cartridge } from './cartridge';
import { PPU } from './ppu';
import { EventHandler, Logger } from './eventHandler';

export class Emulator extends EventHandler {
    constructor (logger?: Logger) {
        super(logger);
        this.bus = new Bus();
        this._graphicBus = new Bus();
        this._ram = new RAM(this.bus);
        this.cpu = new nes6502(this.bus, logger);
        this._cartridge = new Cartridge(this.bus, this._graphicBus);
        this._ppu = new PPU(this.bus, this._graphicBus);
        this._emulation = new NanoTimer();
    }
    public bus: Bus;
    private _graphicBus: Bus;
    private _ram: RAM;
    public cpu: nes6502;
    private _ppu: PPU;
    private _cartridge: Cartridge;
    private _emulation: NanoTimer;

    public cycle: number = 0;
    public cpuClockDivisor: number = 12;
    public ppuClockDivisor: number = 4;
    public cpuCycle: number = this.cpuClockDivisor;
    public ppuCycle: number = this.ppuClockDivisor;

    public start() {
        // normal emulation speed should be 21441960 Hz
        this.bus.read(this.cpu.pc);
        this._emulation.setInterval(() => {
            this.clock();
        }, '', '46n');
    }
    public stop() {
        this._emulation.clearInterval();
        this.broadcast('stop');
    }
    public clock () {
        this.cycle++;
        try {
            this._ram.clock();
            this._cartridge.clock();

            // cpu clock ticks
            this.cpuCycle--;
            if (!this.cpuCycle) {
                this.cpuCycle = this.cpuClockDivisor;
                this.cpu.clock();
            }

            // ppu clock ticks
            this.ppuCycle--;
            if(!this.ppuCycle) {
                this.ppuCycle = this.ppuClockDivisor;
                this._ppu.clock();
            }
    
        } catch(e) {
            this.cpu.microCodeStack.push(() => {
                this.bus.read(0x2);
            });
            this.cpu.microCodeStack.push(() => {
                console.log('Error 1: ', this.bus.data.toString(16));
                this.bus.read(0x3);
            });
            this.cpu.microCodeStack.push(() => {
                console.log('Error 2: ', this.bus.data.toString(16));
                this.stop();
            });
        }
    }
    public loadCartridge(rom: Buffer) {
        this._cartridge?.load(rom);
    }
}