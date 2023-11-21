export enum ReadFlagState {
    read = 1,
    write = 0
}

export class Bus {
    constructor() {
        this._addr = 0;
        this.data = 0;
    }
    private _addr: number;

    set addr(value: number) {
        this._addr = value & 0xffff;
    }
    get addr() {
        return this._addr;
    }

    data: number;
    rwFlag: ReadFlagState = ReadFlagState.read; // writing when true;

    read(addr: number) {
        this._addr = addr;
        this.rwFlag = ReadFlagState.read;
    }
    write(addr: number, data: number) {
        this._addr = addr;
        this.data = data;
        this.rwFlag = ReadFlagState.write;
    }
}