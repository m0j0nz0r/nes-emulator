"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cartridge = void 0;
var NameTableMirroring;
(function (NameTableMirroring) {
    NameTableMirroring[NameTableMirroring["Horizontal"] = 0] = "Horizontal";
    NameTableMirroring[NameTableMirroring["Vertical"] = 1] = "Vertical";
})(NameTableMirroring || (NameTableMirroring = {}));
var ConsoleType;
(function (ConsoleType) {
    ConsoleType[ConsoleType["NES"] = 0] = "NES";
    ConsoleType[ConsoleType["VS"] = 1] = "VS";
    ConsoleType[ConsoleType["P10"] = 2] = "P10";
    ConsoleType[ConsoleType["Ext"] = 3] = "Ext"; // Extended Console Type
})(ConsoleType || (ConsoleType = {}));
var CpuTiming;
(function (CpuTiming) {
    CpuTiming[CpuTiming["RP2C02"] = 0] = "RP2C02";
    CpuTiming[CpuTiming["RP2C07"] = 1] = "RP2C07";
    CpuTiming[CpuTiming["MultipleRegion"] = 2] = "MultipleRegion";
    CpuTiming[CpuTiming["UA6538"] = 3] = "UA6538"; // Dendy
})(CpuTiming || (CpuTiming = {}));
function getShifted(v) {
    return v && (64 << v);
}
class Flags6 {
    constructor(byte) {
        this.nameTableMirroring = byte & (1 << 0x0);
        this.hasBattery = byte & (1 << 1);
        this.hasTrainer = byte & (1 << 2);
        this.hasFourScreenMode = byte & (1 << 3);
        this.mapperNumber = byte >> 4;
    }
}
class Flags7 {
    constructor(byte) {
        this.consoleType = byte & 3; // take lower 2 bits
        this.nes2Id = (byte >> 2) & 3; // take next 2 bits
        this.mapperNumber = byte >> 4;
    }
}
class Headers {
    constructor(buffer) {
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
    get prgRomSize() {
        return this._prgRomSizeHi << 8 | this._prgRomSizeLo;
    }
    ;
    get chrRomSize() {
        return this._chrRomSizeHi << 8 | this._chrRomSizeLo;
    }
    get mapperNumber() {
        return this.mapperNumberHi << 8 | this.flags7.mapperNumber << 4 | this.flags6.mapperNumber;
    }
    get prgRam() {
        return getShifted(this.prgRamShift);
    }
    get prgNvRam() {
        return getShifted(this.prgNvRamShift);
    }
    get chrRam() {
        return getShifted(this.chrRamShift);
    }
    get chrNvRam() {
        return getShifted(this.chrNvRamShift);
    }
}
const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };
class Cartridge {
    constructor(mainBus, graphicsBus) {
        this._mainBus = mainBus;
        this._graphicsBus = graphicsBus;
    }
    _handleGraphicsBus() {
        throw new Error("Method not implemented.");
    }
    _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._mainBus.addr < mainAddrRange.minAddr || this._mainBus.addr > mainAddrRange.maxAddr) {
            return;
        }
        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._mainBus.addr;
    }
    clock() {
        this._handleMainBus();
        this._handleGraphicsBus();
    }
    load(rom) {
        this._headers = new Headers(rom);
        console.log(this._headers);
    }
    ;
}
exports.Cartridge = Cartridge;
//# sourceMappingURL=cartridge.js.map