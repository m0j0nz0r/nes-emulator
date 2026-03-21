import {Nes6502} from './nes6502';

export class Nes6502AddressingModes {

  constructor(cpu: Nes6502) {
  }

  NUL() {} // Dummy Instruction/Adressing mode.
  IMP(cpu: Nes6502) {
    // Implied
    cpu.microCodeStack.push(() => {
      cpu.bus.data = cpu.a;
      cpu.pc++;
    });
  }
  IMM(cpu: Nes6502) {
    // Immediate            #v
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
      cpu.pc++;
    });
  }
  ZP0(cpu: Nes6502) {
    // Zero Page            d
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.read(cpu.bus.data & 0xff);
      cpu.pc++;
    });
  }
  ZP0RW(cpu: Nes6502) {
    this.ZP0(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  private _ZPI(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu._t = cpu.bus.data + reg;
    });
    cpu.microCodeStack.push(() => cpu.bus.read(cpu._t & 0xff));
  }
  private _ZPIRW(cpu: Nes6502, reg: number) {
    this._ZPI(cpu, reg);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  ZPX(cpu: Nes6502) {
    this._ZPI(cpu, cpu.x);
  }
  ZPY(cpu: Nes6502) {
    this._ZPI(cpu, cpu.y);
  }
  ZPXRW(cpu: Nes6502) {
    this._ZPIRW(cpu, cpu.x);
  }
  ZPYRW(cpu: Nes6502) {
    this._ZPIRW(cpu, cpu.y);
  }
  ABS(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.pc++;
      cpu.bus.read(cpu.pc);
      cpu.pc++;
    });
    cpu.microCodeStack.push(() => {
      cpu.absRead();
    });
  }
  ABSRW(cpu: Nes6502) {
    this.ABS(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  REL(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
  }
  IND(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.read((cpu.bus.data << 8) | cpu._t);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.bus.read(
        (cpu.bus.addr & 0xff00) | ((cpu.bus.addr + 1) & 0xff)
      );
    });
    cpu.microCodeStack.push(() => {
      cpu.absRead();
    });
  }
  private _ABIR(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    const op = cpu.fetch?.name || '';
    if (['STA', 'STX', 'STY', 'SHA', 'SHX', 'SHY'].includes(op)) {
      cpu.microCodeStack.push(() => {
        const lo = cpu._t + reg;
        const hi = cpu.bus.data << 8;
        cpu.bus.read(hi + (lo & 0xff));
        cpu.pc++;
        cpu.microCodeStack.unshift(() => {
          cpu.bus.write(hi + lo, cpu.bus.data);
        });
      });
      return;
    }
    cpu.microCodeStack.push(() => {
      const lo = cpu._t + reg;
      const hi = cpu.bus.data << 8;
      cpu.bus.read(hi + (lo & 0xff));
      if (lo > 0xff) {
        cpu.microCodeStack.unshift(() => cpu.bus.read(hi + lo));
      }
      cpu.pc++;
    });
  }
  private _ABIW(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      const lo = cpu._t + reg;
      const hi = cpu.bus.data << 8;
      cpu.bus.read(hi + (lo & 0xff));
      cpu.pc++;
      cpu.microCodeStack.unshift(() => {
        cpu.bus.write(hi + lo, cpu.bus.data);
      });
    });
  }
  private _ABIRW(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      const lo = cpu._t + reg;
      const hi = cpu.bus.data << 8;
      cpu.bus.read(hi + (lo & 0xff));
      cpu.microCodeStack.unshift(() => cpu.bus.read(hi + lo));
      cpu.pc++;
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  ABXR(cpu: Nes6502) {
    this._ABIR(cpu, cpu.x);
  }
  ABYR(cpu: Nes6502) {
    this._ABIR(cpu, cpu.y);
  }
  ABXW(cpu: Nes6502) {
    this._ABIW(cpu, cpu.x);
  }
  ABYW(cpu: Nes6502) {
    this._ABIW(cpu, cpu.y);
  }
  ABXRW(cpu: Nes6502) {
    this._ABIRW(cpu, cpu.x);
  }
  ABYRW(cpu: Nes6502) {
    this._ABIRW(cpu, cpu.y);
  }
  IZX(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() =>
      cpu.bus.read(cpu.bus.data & 0xff)
    );
    cpu.microCodeStack.push(() => {
      cpu.bus.read((cpu.bus.addr + cpu.x) & 0xff);
      cpu.pc++;
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data;
      cpu.bus.read((cpu.bus.addr + 1) & 0xff);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.read((cpu.bus.data << 8) + cpu._t);
    });
  }
  IZXRW(cpu: Nes6502) {
    this.IZX(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  IZY(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.bus.data & 0xff);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data + cpu.y;
      cpu.bus.read((cpu.bus.addr + 1) & 0xff);
    });
    const op = cpu.fetch?.operation;
    if (op === cpu.STA || op === cpu.SAX) {
      cpu.microCodeStack.push(() => {
        const hi = cpu.bus.data << 8;
        const lo = cpu._t;
        cpu.bus.read(hi + lo);
      });
      cpu.microCodeStack.push(() => {
        cpu.bus.write(cpu.bus.addr, cpu.bus.data);
      });
      return;
    }
    cpu.microCodeStack.push(() => {
      const hi = cpu.bus.data << 8;
      const lo = cpu._t;
      cpu.bus.read(hi | (lo & 0xff));
      if (lo > 0xff) {
        cpu.microCodeStack.unshift(() => {
          cpu.bus.read(hi + lo);
        });
      }
    });
  }
  IZYW(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.bus.data & 0xff);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data + cpu.y;
      cpu.bus.read((cpu.bus.addr + 1) & 0xff);
    });
    cpu.microCodeStack.push(() => {
      const hi = cpu.bus.data << 8;
      const lo = cpu._t;
      cpu.bus.read(hi + lo);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
  IZYRW(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.bus.read(cpu.bus.data & 0xff);
    });
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.bus.data + cpu.y;
      cpu.bus.read((cpu.bus.addr + 1) & 0xff);
    });
    cpu.microCodeStack.push(() => {
      const hi = cpu.bus.data << 8;
      const lo = cpu._t;
      cpu.bus.read(hi + lo);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.read(cpu.bus.addr);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(cpu.bus.addr, cpu.bus.data);
    });
  }
}
