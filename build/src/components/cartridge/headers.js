"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Headers = void 0;
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
        this.nameTableMirroring = byte & (1 << 0);
        this.hasBattery = byte & (1 << 1);
        this.hasTrainer = byte & (1 << 2);
        this.hasFourScreenMode = byte & (1 << 3);
        this.mapperNumber = byte >> 4;
    }
}
class Flags7 {
    constructor(byte) {
        this.consoleType = byte & 0x3; // take lower 2 bits
        this.nes2Id = (byte >> 2) & 0x3; // take next 2 bits
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
    get prgRomSize() {
        const unitSize = 0x4000;
        if (this._prgRomSizeHi === 0xf) {
            const mm = this._prgRomSizeLo & 3;
            const exp = this._prgRomSizeLo >> 2;
            return Math.pow(2, exp) * (mm * 2 + 1) * unitSize;
        }
        return (this._prgRomSizeHi << 8 | this._prgRomSizeLo) * unitSize;
    }
    ;
    get chrRomSize() {
        const unitSize = 0x2000;
        if (this._chrRomSizeHi === 0xf) {
            const mm = this._chrRomSizeLo & 3;
            const exp = this._chrRomSizeLo >> 2;
            return Math.pow(2, exp) * (mm * 2 + 1) * unitSize;
        }
        return (this._chrRomSizeHi << 8 | this._chrRomSizeLo) * unitSize;
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
exports.Headers = Headers;
//# sourceMappingURL=headers.js.map