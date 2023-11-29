import { Bus, ReadFlagState } from './bus';

const addrRange = { minAddr: 0x0000, maxAddr: 0x1fff};

export class RAM {
    constructor (bus: Bus, ram: number[] | Buffer = [], range = addrRange, mirroring = 0x7ff) {
        this._bus = bus;
        this._ram = ram;
        this._range = range;
        this._mirroring = mirroring;
    }
    private _bus: Bus;
    private _ram: number[] | Buffer;
    private _range: {minAddr: number, maxAddr: number};
    private _mirroring: number; 
    public clock() {
        // make sure we are on our addressable space.
        if (this._bus.addr < this._range.minAddr || this._bus.addr > this._range.maxAddr) {
            return;
        }

        const addr = (this._bus.addr - this._range.minAddr) & this._mirroring;

        if (this._bus.rwFlag === ReadFlagState.write) {
            // if bus is writing, save to ram. Make sure we only write a single byte
            this._ram[addr] = this._bus.data & 0x00ff;
        } else {
            // if bus is reading, write to bus.
            // if the address space is undefined, we write 0 to the bus.
            this._bus.data = this._ram[addr] || 0;
        }
    }
}