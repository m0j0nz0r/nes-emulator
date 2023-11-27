/// <reference types="node" />
export declare class Emulator {
    constructor();
    private _bus;
    private _graphicBus;
    private _ram;
    private _cpu;
    private _ppu;
    private _cartridge;
    private _emulation?;
    private start;
    private stop;
    clock(): void;
    loadCartridge(rom: Buffer): void;
}
