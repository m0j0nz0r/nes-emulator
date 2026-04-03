export enum ReadFlagState {
  read = 1,
  write = 0,
}

export interface AddressRange {
  minAddr: number;
  maxAddr: number;
}
export interface BusHandler {
  addressRange: AddressRange;
  read(addr: number, data?: number): number;
  write(addr: number, data: number): void;
}
export class Bus {
  constructor() {}
  private _handlers: BusHandler[] = [];
  private _addr = 0;
  public get addr() {
    return this._addr;
  }
  private _data = 0;
  public get data() {
    return this._data;
  }
  read(addr: number | undefined): number {
    if (addr === undefined) {
      addr = this._addr;
    } else {
      this._addr = addr;
    }
    addr &= 0xffff;
    for (const handler of this._handlers) {
      if (
        addr >= handler.addressRange.minAddr &&
        addr <= handler.addressRange.maxAddr
      ) {
        const data = handler.read(
          addr - handler.addressRange.minAddr,
          this._data
        );
        this._data = data;
        return data;
      }
    }
    return 0;
  }
  write(addr: number | undefined, data: number | undefined): void {
    if (addr === undefined) {
      addr = this._addr;
    } else {
      this._addr = addr;
    }
    if (data === undefined) {
      data = this._data;
    } else {
      this._data = data;
    }
    addr &= 0xffff;
    data &= 0xff;
    this._data = data;
    for (const handler of this._handlers) {
      if (
        addr >= handler.addressRange.minAddr &&
        addr <= handler.addressRange.maxAddr
      ) {
        handler.write(addr - handler.addressRange.minAddr, data);
        return;
      }
    }
  }
  attach(handler: BusHandler): void {
    this._handlers.push(handler);
  }
}
