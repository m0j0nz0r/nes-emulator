import {AddressRange, Bus, BusHandler, ReadFlagState} from './bus';

const addrRange = {minAddr: 0x0000, maxAddr: 0x1fff};

export class RAM implements BusHandler {
  constructor(
    bus: Bus,
    ram: number[] | Buffer = [],
    range = addrRange,
    mirroring = 0x7ff
  ) {
    this._bus = bus;
    this._bus.attach(this);
    this._ram = ram;
    this._range = range;
    this._mirroring = mirroring;
  }
  private _bus: Bus;
  private _ram: number[] | Buffer;
  private _range: {minAddr: number; maxAddr: number};
  private _mirroring: number;
  public get addressRange(): AddressRange {
    return this._range;
  }
  public read(addr: number): number {
    addr &= this._mirroring;
    return this._ram[addr] || 0;
  }
  public write(addr: number, data: number): void {
    addr &= this._mirroring;
    this._ram[addr] = data;
  }
}
