/// <reference types="node" />
import { Bus } from "./bus";
export declare class Cartridge {
    constructor(mainBus: Bus, graphicsBus: Bus);
    private _mainBus;
    private _graphicsBus;
    private _handleGraphicsBus;
    private _handleMainBus;
    private _headers?;
    clock(): void;
    load(rom: Buffer): void;
}
