import { Bus } from './bus';
export declare class RAM {
    constructor(bus: Bus);
    private _bus;
    private _ram;
    clock(): void;
}
