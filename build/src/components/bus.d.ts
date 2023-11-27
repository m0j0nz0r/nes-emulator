export declare enum ReadFlagState {
    read = 1,
    write = 0
}
export declare class Bus {
    constructor();
    private _addr;
    set addr(value: number);
    get addr(): number;
    data: number;
    rwFlag: ReadFlagState;
    read(addr: number): void;
    write(addr: number, data: number): void;
}
