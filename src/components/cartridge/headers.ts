enum NameTableMirroring {
  Horizontal = 0,
  Vertical = 1,
}
enum ConsoleType {
  NES = 0, // Nintendo Entertainment System/Family Computer
  VS = 1, // Nintendo Vs. System
  P10 = 2, // Nintendo Playchoice 10
  Ext = 3, // Extended Console Type
}
enum CpuTiming {
  RP2C02 = 0, // NTSC NES
  RP2C07 = 1, // PAL NES
  MultipleRegion = 2,
  UA6538 = 3, // Dendy
}

function getShifted(v: number): number {
  return v && 64 << v;
}

class Flags6 {
  constructor(byte: number) {
    this.nameTableMirroring = byte & (1 << 0);
    this.hasBattery = byte & (1 << 1);
    this.hasTrainer = byte & (1 << 2);
    this.hasFourScreenMode = byte & (1 << 3);
    this.mapperNumber = byte >> 4;
  }
  nameTableMirroring: NameTableMirroring;
  hasBattery: number; // boolean
  hasTrainer: number; // boolean
  hasFourScreenMode: number;
  mapperNumber: number; // D0..D3
}
class Flags7 {
  constructor(byte: number) {
    this.consoleType = byte & 0x3; // take lower 2 bits
    this.nes2Id = (byte >> 2) & 0x3; // take next 2 bits
    this.mapperNumber = byte >> 4;
  }
  consoleType: ConsoleType;
  nes2Id: number;
  mapperNumber: number; // D4..D7
}

export class Headers {
  constructor(buffer: Buffer) {
    let byte = 0;
    this.idString = buffer.toString('utf8', 0, 4);
    this._prgRomSizeLo = buffer.readUint8(4);
    this._chrRomSizeLo = buffer.readUint8(5);
    this.flags6 = new Flags6(buffer.readUint8(6));
    this.flags7 = new Flags7(buffer.readUint8(7));
    byte = buffer.readUint8(8);
    this.mapperNumberHi = byte & 0xf; // take lo nybble
    this.subMapperNumber = byte >> 4; // take hi nybble

    byte = buffer.readUint8(9);
    this._prgRomSizeHi = byte & 0xf;
    this._chrRomSizeHi = byte >> 4;

    byte = buffer.readUint8(10);
    this.prgRamShift = byte & 0xf;
    this.prgNvRamShift = byte >> 4;

    byte = buffer.readUint8(11);
    this.chrRamShift = byte & 0xf;
    this.chrNvRamShift = byte >> 4;

    this.cpuTiming = buffer.readUint8(12) & 0x3;

    // Not sure how to implement this yet.
    // byte = buffer.readUint8(13);

    this.MiscRoms = buffer.readUint8(14) & 0x3;
    this.defaultExpansionDevice = buffer.readUint8(15) & 0x3f;
  }
  idString: string;
  private _prgRomSizeLo: number;
  private _prgRomSizeHi: number;
  get prgRomSize(): number {
    const unitSize = 0x4000;
    if (this._prgRomSizeHi === 0xf) {
      const mm = this._prgRomSizeLo & 3;
      const exp = this._prgRomSizeLo >> 2;
      return Math.pow(2, exp) * (mm * 2 + 1) * unitSize;
    }
    return ((this._prgRomSizeHi << 8) | this._prgRomSizeLo) * unitSize;
  }
  private _chrRomSizeLo: number;
  private _chrRomSizeHi: number;
  get chrRomSize(): number {
    const unitSize = 0x2000;
    if (this._chrRomSizeHi === 0xf) {
      const mm = this._chrRomSizeLo & 3;
      const exp = this._chrRomSizeLo >> 2;
      return Math.pow(2, exp) * (mm * 2 + 1) * unitSize;
    }
    return ((this._chrRomSizeHi << 8) | this._chrRomSizeLo) * unitSize;
  }
  flags6: Flags6;
  flags7: Flags7;
  mapperNumberHi: number; // D8..D11
  get mapperNumber(): number {
    return (
      (this.mapperNumberHi << 8) |
      (this.flags7.mapperNumber << 4) |
      this.flags6.mapperNumber
    );
  }
  subMapperNumber: number;
  prgRamShift: number;
  get prgRam(): number {
    return getShifted(this.prgRamShift);
  }
  prgNvRamShift: number;
  get prgNvRam(): number {
    return getShifted(this.prgNvRamShift);
  }
  chrRamShift: number;
  get chrRam(): number {
    return getShifted(this.chrRamShift);
  }
  chrNvRamShift: number;
  get chrNvRam(): number {
    return getShifted(this.chrNvRamShift);
  }
  cpuTiming: CpuTiming;
  VSType?: number;
  ExtType?: number;
  MiscRoms: number;
  defaultExpansionDevice: number;
}
