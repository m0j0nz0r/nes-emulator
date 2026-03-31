import * as NanoTimer from 'nanotimer';
import {Bus} from './bus';
import {RAM} from './RAM';
import {Nes6502} from './nes6502';
import {Cartridge} from './cartridge';
import {PPU} from './ppu';
import {EventHandler, Logger} from './eventHandler';
import {defaultPaletteData} from '../palettes/defaultPalette';

export class Emulator extends EventHandler {
  constructor(paletteData: Buffer = defaultPaletteData, logger?: Logger) {
    super(logger);
    this.bus = new Bus();
    this._graphicBus = new Bus();
    this._ram = new RAM(this.bus);
    this.cpu = new Nes6502(this.bus, logger);
    this._cartridge = new Cartridge(this.bus, this._graphicBus);
    this.ppu = new PPU(this.bus, this._graphicBus, paletteData, logger);
    this._emulation = new NanoTimer();
    this._setupEventListeners();
  }
  public bus: Bus;
  private _graphicBus: Bus;
  private _ram: RAM;
  public cpu: Nes6502;
  public ppu: PPU;
  private _cartridge: Cartridge;
  private _emulation: NanoTimer;

  public cycle = 0;
  public cpuClockDivisor = 12;
  public ppuClockDivisor = 4;
  public cpuCycle: number = this.cpuClockDivisor;
  public ppuCycle: number = this.ppuClockDivisor;
  public get screen(): Uint8ClampedArray {
    return this.ppu.screen;
  }

  public start() {
    // normal emulation speed should be 21441960 Hz
    this._emulation.setInterval(
      () => {
        this.clock();
      },
      '',
      '46n'
    );
  }
  public stop() {
    this._emulation.clearInterval();
  }
  public clock() {
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
      if (!this.ppuCycle) {
        this.ppuCycle = this.ppuClockDivisor;
        this.ppu.clock();
        if (this.ppu.nmi) {
          this.cpu.nmi();
          this.ppu.nmi = false;
          console.log('NMI! Emulator');
        }
      }
    } catch (e) {
      this.cpu.microCodeStack.push(() => {
        console.log(e);
        this.stop();
      });
    }
  }
  public loadCartridge(rom: Buffer) {
    this._cartridge?.load(rom);
  }
  public reset() {
    this.stop();
    this.cpu.reset();
    this.cycle = 0;
  }
  private _setupEventListeners() {
    this.cpu.on('fetch', event => {
      this.broadcast('cpu:fetch', event);
    });
    this.cpu.on('stop', () => {
      this.stop();
      this.broadcast('cpu:stop');
    });
    this.ppu.on('frame', event => {
      this.broadcast('ppu:frame', event);
    });
    this.ppu.on('operation', event => {
      this.broadcast('ppu:operation', event);
    });
  }
}
