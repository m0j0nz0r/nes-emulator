export enum ReadFlagState {
  read = 1,
  write = 0,
}

export class Bus {
  constructor() {
    this._addr = 0;
    this._data = 0;
  }
  private _addr: number;
  private _isHandled = true;
  get isHandled() {
    return this._isHandled;
  }

  set addr(value: number) {
    this._addr = value & 0xffff;
  }
  get addr() {
    return this._addr;
  }

  private _data: number;
  set data(v: number) {
    this._data = v & 0xff;
  }
  get data(): number {
    return this._data;
  }

  rwFlag: ReadFlagState = ReadFlagState.read;
  read(addr: number) {
    this.addr = addr;
    this.rwFlag = ReadFlagState.read;
    this._isHandled = false;
  }
  write(addr: number, data: number) {
    this.addr = addr;
    this.data = data;
    this.rwFlag = ReadFlagState.write;
    this._isHandled = false;
  }
  handle() {
    this._isHandled = true;
  }
}
