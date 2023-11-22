import { Bus } from './bus';
import { RAM } from './RAM';
import { nes6502 } from './nes6502';

export class Emulator {
    constructor () {
        this._bus = new Bus();
        this._ram = new RAM(this._bus, {minAddr: 0x0000, maxAddr: 0x1fff});
        this._cpu = new nes6502(this._bus);
    }
    private _bus: Bus;
    private _ram: RAM;
    private _cpu: nes6502;
    private _emulation?: NodeJS.Timeout;

    private start() {
        this._emulation = setInterval(() => this.clock(), 1000/this._cpu.clockSpeed)
    }
    private stop() {
        clearTimeout(this._emulation);
    }
    public clock () {
        this._ram.clock();
        this._cpu.clock();
    }
}