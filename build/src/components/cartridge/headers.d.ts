/// <reference types="node" />
declare enum NameTableMirroring {
    Horizontal = 0,
    Vertical = 1
}
declare enum ConsoleType {
    NES = 0,
    VS = 1,
    P10 = 2,
    Ext = 3
}
declare enum CpuTiming {
    RP2C02 = 0,
    RP2C07 = 1,
    MultipleRegion = 2,
    UA6538 = 3
}
declare class Flags6 {
    constructor(byte: number);
    nameTableMirroring: NameTableMirroring;
    hasBattery: number;
    hasTrainer: number;
    hasFourScreenMode: number;
    mapperNumber: number;
}
declare class Flags7 {
    constructor(byte: number);
    consoleType: ConsoleType;
    nes2Id: number;
    mapperNumber: number;
}
export declare class Headers {
    constructor(buffer: Buffer);
    idString: string;
    private _prgRomSizeLo;
    private _prgRomSizeHi;
    get prgRomSize(): number;
    private _chrRomSizeLo;
    private _chrRomSizeHi;
    get chrRomSize(): number;
    flags6: Flags6;
    flags7: Flags7;
    mapperNumberHi: number;
    get mapperNumber(): number;
    subMapperNumber: number;
    prgRamShift: number;
    get prgRam(): number;
    prgNvRamShift: number;
    get prgNvRam(): number;
    chrRamShift: number;
    get chrRam(): number;
    chrNvRamShift: number;
    get chrNvRam(): number;
    cpuTiming: CpuTiming;
    VSType?: number;
    ExtType?: number;
    MiscRoms: number;
    defaultExpansionDevice: number;
}
export {};
