import { Bus, ReadFlagState } from './bus';

const addrRange = { minAddr: 0x0000, maxAddr: 0x1fff};

export class RAM {
    constructor (bus: Bus) {
        this._bus = bus;
        this._ram = [];
    }
    private _bus: Bus;
    private _ram: number[];
    public clock() {
        // make sure we are on our addressable space.
        if (this._bus.addr < addrRange.minAddr || this._bus.addr > addrRange.maxAddr) {
            return;
        }

        // Mirroring: we have 2kb of ram which we mirror over the 8kb addressable range.
        const addr = this._bus.addr & 0x7ff;

        if (this._bus.rwFlag = ReadFlagState.write) {
            // if bus is writing, save to ram. Make sure we only write a single byte
            this._ram[addr] = this._bus.data & 0x00ff;
        } else {
            // if bus is reading, write to bus.
            // if the address space is undefined, we write 0 to the bus.
            this._bus.data = this._ram[addr] || 0;
        }
    }
}