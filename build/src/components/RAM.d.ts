/// <reference types="node" />
import { Bus } from './bus';
export declare class RAM {
    constructor(bus: Bus, ram?: number[] | Buffer, range?: {
        minAddr: number;
        maxAddr: number;
    }, mirroring?: number);
    private _bus;
    private _ram;
    private _range;
    private _mirroring;
    clock(): void;
}
