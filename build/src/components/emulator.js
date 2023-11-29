"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emulator = void 0;
const bus_1 = require("./bus");
const RAM_1 = require("./RAM");
const nes6502_1 = require("./nes6502");
const cartridge_1 = require("./cartridge");
const ppu_1 = require("./ppu");
class Emulator {
    constructor() {
        this._bus = new bus_1.Bus();
        this._graphicBus = new bus_1.Bus();
        this._ram = new RAM_1.RAM(this._bus);
        this._cpu = new nes6502_1.nes6502(this._bus);
        this._cartridge = new cartridge_1.Cartridge(this._bus, this._graphicBus);
        this._ppu = new ppu_1.PPU(this._bus, this._graphicBus);
    }
    start() {
        this._cpu.pc = 0xc000;
        this._bus.read(this._cpu.pc);
        this._emulation = setInterval(() => this.clock(), 1000 / this._cpu.clockSpeed);
    }
    stop() {
        clearTimeout(this._emulation);
    }
    clock() {
        try {
            this._ram.clock();
            this._cartridge.clock();
            this._cpu.clock();
            this._ppu.clock();
        }
        catch (e) {
            this._cpu.microCodeStack.push(() => {
                this._bus.read(0x2);
            });
            this._cpu.microCodeStack.push(() => {
                console.log('Error 1: ', this._bus.data.toString(16));
                this._bus.read(0x3);
            });
            this._cpu.microCodeStack.push(() => {
                console.log('Error 2: ', this._bus.data.toString(16));
                this.stop();
            });
        }
    }
    loadCartridge(rom) {
        var _a;
        (_a = this._cartridge) === null || _a === void 0 ? void 0 : _a.load(rom);
    }
}
exports.Emulator = Emulator;
//# sourceMappingURL=emulator.js.map