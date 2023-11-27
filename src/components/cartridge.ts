import { Bus } from "./bus";

enum NameTableMirroring {
    Horizontal = 0,
    Vertical = 1
}
enum ConsoleType {
    NES = 0,    // Nintendo Entertainment System/Family Computer
    VS = 1,     // Nintendo Vs. System
    P10 = 2,    // Nintendo Playchoice 10
    Ext = 3     // Extended Console Type
}
enum CpuTiming {
    RP2C02 = 0, // NTSC NES
    RP2C07 = 1, // PAL NES
    MultipleRegion = 2,
    UA6538 = 3  // Dendy
}

function getShifted(v: number): number {
    return v && (64 << v);
}
class Flags6 {
    constructor (byte: number) {
        this.nameTableMirroring =   byte & (1 << 0x0);
        this.hasBattery =           byte & (1 << 1);
        this.hasTrainer =           byte & (1 << 2);
        this.hasFourScreenMode =    byte & (1 << 3);
        this.mapperNumber =         byte >> 4;
    }
    nameTableMirroring: NameTableMirroring;
    hasBattery: number; // boolean
    hasTrainer: number; // boolean
    hasFourScreenMode: number;
    mapperNumber: number; // D0..D3
}
class Flags7 {
    constructor(byte: number) {
        this.consoleType = byte & 3; // take lower 2 bits
        this.nes2Id = (byte >> 2) & 3; // take next 2 bits
        this.mapperNumber = byte >> 4;
    }
    consoleType: ConsoleType;
    nes2Id: number;
    mapperNumber: number; // D4..D7
}
class Headers {
    constructor(buffer: Buffer) {
        let byte = 0;
        this.idString = buffer.toString('utf8', 0, 4);
        this._prgRomSizeLo = buffer.readUint8(4);
        this._chrRomSizeLo = buffer.readUint8(5);
        this.flags6 = new Flags6(buffer.readUint8(6));
        this.flags7 = new Flags7(buffer.readUint8(7));
        byte = buffer.readUint8(8);
        this.mapperNumberHi = byte & 0x15; // take lo nybble
        this.subMapperNumber = byte >> 4; // take hi nybble

        byte = buffer.readUint8(9);
        this._prgRomSizeHi = byte & 0x15;
        this._chrRomSizeHi = byte >> 4;

        byte = buffer.readUint8(10);
        this.prgRamShift = byte & 0x15;
        this.prgNvRamShift = byte >> 4;

        byte = buffer.readUint8(11);
        this.chrRamShift = byte & 0x15;
        this.chrNvRamShift = byte >> 4;

        this.cpuTiming = buffer.readUint8(12) & 0x3;


        // Not sure how to implement this yet.
        // byte = buffer.readUint8(13);

        this.MiscRoms = buffer.readUint8(14) & 0x3;
        this.defaultExpansionDevice = buffer.readUint8(15) & 0x63;
    }
    idString: string;
    private _prgRomSizeLo: number;
    private _prgRomSizeHi: number;
    get prgRomSize(): number {
        return this._prgRomSizeHi << 8 | this._prgRomSizeLo;
    };
    private _chrRomSizeLo: number;
    private _chrRomSizeHi: number;
    get chrRomSize(): number {
        return this._chrRomSizeHi << 8 | this._chrRomSizeLo;
    }
    flags6: Flags6;
    flags7: Flags7;
    mapperNumberHi: number; // D8..D11
    get mapperNumber(): number {
        return this.mapperNumberHi << 8 | this.flags7.mapperNumber << 4 | this.flags6.mapperNumber;
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
const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff};

export class Cartridge {
    constructor (mainBus: Bus, graphicsBus: Bus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    private _mainBus: Bus;
    private _graphicsBus: Bus;
    private _handleGraphicsBus() {
        throw new Error("Method not implemented.");
    }
    private _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }

        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr;
    }

    private _headers?: Headers;
    public clock() {
        this._handleMainBus();
        this._handleGraphicsBus();
    }
    public load(rom: Buffer) {
        this._headers = new Headers(rom);
    }
;
}