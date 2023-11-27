import { Bus } from "./bus";
export declare class PPU {
    constructor(mainBus: Bus, graphicsBus: Bus);
    private _mainBus;
    private _graphicsBus;
    private _handleMainBus;
    clock(): void;
}
