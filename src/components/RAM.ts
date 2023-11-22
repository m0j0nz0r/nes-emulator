import { Bus, ReadFlagState } from './bus';
export interface AddrRange {
    minAddr: number;
    maxAddr: number;
}
export class RAM {
    constructor (bus: Bus, addrRange: AddrRange) {
        this._bus = bus;
        this._ram = [];
        this._addrRange = {...addrRange}; // shallow clone to prevent outside changes at runtime.
    }
    private _bus: Bus;
    private _ram: number[];
    private _addrRange: AddrRange;
    public clock() {
        // make sure we are on our addressable space.
        if (this._bus.addr > this._addrRange.minAddr && this._bus.addr < this._addrRange.maxAddr) {
            if (this._bus.rwFlag = ReadFlagState.write) {
                // if bus is writing, save to ram. Make sure we only write a single byte
                this._ram[this._bus.addr & 0x7ff] = this._bus.data & 0x00ff;
            } else {
                // if bus is reading, write to bus.
                // if the address space is undefined, we write 0 to the bus.
                this._bus.data = this._ram[this._bus.addr & 0x7ff] || 0;
            }
        }
    }
}