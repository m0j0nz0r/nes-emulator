import {RAM} from './RAM';
import {Bus} from './bus';
import {Headers} from './cartridge/headers';

export class Cartridge {
  constructor(mainBus: Bus, graphicsBus: Bus) {
    this._mainBus = mainBus;
    this._graphicsBus = graphicsBus;
  }
  private _mainBus: Bus;
  private _graphicsBus: Bus;
  public trainer?: RAM;
  public prgRom?: RAM;
  public chrRom?: RAM;
  public miscRom?: RAM;

  private _headers?: Headers;
  public load(rom: Buffer) {
    let offset = 16;
    this._headers = new Headers(rom);
    const hasTrainer = this._headers.flags6.hasTrainer;

    if (hasTrainer) {
      this.trainer = new RAM(
        this._mainBus,
        rom.subarray(offset, offset + 511),
        {minAddr: 0x7000, maxAddr: 0x71ff}
      );
      offset += 512;
    }

    // load PRG_ROM
    this.prgRom = new RAM(
      this._mainBus,
      rom.subarray(offset, this._headers.prgRomSize + offset),
      {minAddr: 0x8000, maxAddr: 0xffff},
      this._headers.prgRomSize > 0x4000 ? 0x7fff : 0x3fff
    );

    offset += this._headers.prgRomSize;

    // load CHR_ROM
    if (this._headers.chrRomSize) {
      const chrRom = rom.subarray(offset, this._headers.chrRomSize + offset);
      offset += this._headers.chrRomSize;

      this.chrRom = new RAM(
        this._graphicsBus,
        chrRom,
        {minAddr: 0x0000, maxAddr: 0x1fff},
        this._headers.chrRomSize > 0x2000 ? 0x1fff : 0xfff
      );
    }

    // load misc rom
    if (offset !== rom.byteLength) {
      const misc = rom.subarray(offset);
      this.miscRom = new RAM(
        this._mainBus,
        misc,
        {minAddr: 0x6000, maxAddr: 0x7fff},
        misc.byteLength > 0x2000 ? 0x1fff : misc.byteLength - 1
      );
    }
  }
}
