import {Nes6502} from './nes6502';

export class Nes6502AddressingModes {
  public static instance = new Nes6502AddressingModes();

  constructor() {
    if (Nes6502AddressingModes.instance) {
      return Nes6502AddressingModes.instance;
    }
    Nes6502AddressingModes.instance = this;
    return this;
  }

  public operandString = ''; // For logging purposes, the string representation of the operand for the current instruction.

  NUL() {} // Dummy Instruction/Adressing mode.
  IMP(cpu: Nes6502) {
    // Implied
    cpu.microCodeStack.push(() => {
      cpu._t = cpu.a;
      cpu.pc++;
      cpu.addressingModes.operandString = '';
    });
  }
  IMM(cpu: Nes6502) {
    // #$00
    // Immediate            #v
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
      cpu.addressingModes.operandString =
        '#$' + cpu._t.toString(16).padStart(2, '0').toUpperCase();
      cpu.pc++;
    });
  }
  ZP0(cpu: Nes6502) {
    // Zero Page $00 = 00
    // Zero Page            d
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
      cpu.addressingModes.operandString =
        '$' + cpu._t.toString(16).padStart(2, '0').toUpperCase();
    });
    cpu.microCodeStack.push(() => {
      cpu.read(cpu._t);
      cpu.addressingModes.operandString +=
        ' = ' + cpu._t.toString(16).padStart(2, '0').toUpperCase();
      cpu.pc++;
    });
  }
  ZP0RW(cpu: Nes6502) {
    Nes6502AddressingModes.instance.ZP0(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, cpu._t);
    });
  }
  private _ZPI(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu._t += reg;
    });
    cpu.microCodeStack.push(() => cpu.read(cpu._t & 0xff));
  }
  private _ZPIRW(cpu: Nes6502, reg: number) {
    Nes6502AddressingModes.instance._ZPI(cpu, reg);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, cpu._t);
    });
  }
  ZPX(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ZPI(cpu, cpu.x);
  }
  ZPY(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ZPI(cpu, cpu.y);
  }
  ZPXRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ZPIRW(cpu, cpu.x);
  }
  ZPYRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ZPIRW(cpu, cpu.y);
  }
  ABS(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc); // read low byte
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      const lo = cpu._t;
      cpu.read(cpu.pc); // read high byte
      cpu.pc++;
      cpu._t = (cpu._t << 8) | lo;
    });
    cpu.microCodeStack.push(() => {
      this.operandString =
        '$' + cpu._t.toString(16).padStart(4, '0').toUpperCase();
      cpu.read(cpu._t);
    });
  }
  ABSRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance.ABS(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, cpu._t);
    });
  }
  REL(cpu: Nes6502) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
  }
  IND(cpu: Nes6502) {
    let next = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc); // read low byte
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      const lo = cpu._t;
      cpu.read(cpu.pc); // read high byte
      const hi = cpu._t << 8;
      cpu._t = hi | lo;
      next = hi | ((lo + 1) & 0xff);
    });
    cpu.microCodeStack.push(() => {
      cpu.read(cpu._t);
    });
    cpu.microCodeStack.push(() => {
      const lo = cpu._t;
      cpu.read(next);
      cpu._t = (cpu._t << 8) | lo;
    });
    cpu.microCodeStack.push(() => {
      cpu.read(cpu._t);
    });
  }
  private _ABIRspecialOps = new Set(['STA', 'STX', 'STY', 'SHA', 'SHX', 'SHY']);
  private _ABIR(cpu: Nes6502, reg: number) {
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      const lo = cpu._t;
      cpu.read(cpu.pc);
      cpu._t = (cpu._t << 8) | lo;
    });
    const op = cpu.fetch?.name || '';
    const ops = Nes6502AddressingModes.instance._ABIRspecialOps;
    if (ops.has(op)) {
      cpu.microCodeStack.push(() => {
        const hi = cpu._t & 0xff00;
        const lo = (cpu._t & 0xff) + reg;
        cpu.read(hi | (lo & 0xff));
        cpu.pc++;
        cpu.microCodeStack.unshift(() => {
          cpu.bus.write(hi + lo, cpu._t & 0xff);
        });
      });
      return;
    }
    cpu.microCodeStack.push(() => {
      const lo = (cpu._t & 0xff) + reg;
      const hi = cpu._t & 0xff00;
      cpu.read(hi | (lo & 0xff));
      if (lo > 0xff) {
        cpu.microCodeStack.unshift(() => cpu.read(hi + lo));
      }
      cpu.pc++;
    });
  }
  private _ABIW(cpu: Nes6502, reg: number) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      temp = cpu._t;
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      const lo = temp + reg;
      const hi = cpu._t << 8;
      cpu.read(hi | (lo & 0xff));
      cpu.pc++;
      cpu.microCodeStack.unshift(() => {
        cpu.bus.write(hi + lo, undefined);
      });
    });
  }
  private _ABIRW(cpu: Nes6502, reg: number) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc); // read low byte
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      temp = cpu._t;
      cpu.read(cpu.pc); // read high byte
    });
    cpu.microCodeStack.push(() => {
      const lo = (temp & 0xff) + reg;
      const hi = cpu._t << 8;
      cpu.read(hi + (lo & 0xff));
      cpu.microCodeStack.unshift(() => cpu.read(hi + lo));
      cpu.pc++;
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, undefined);
    });
  }
  ABXR(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIR(cpu, cpu.x);
  }
  ABYR(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIR(cpu, cpu.y);
  }
  ABXW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIW(cpu, cpu.x);
  }
  ABYW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIW(cpu, cpu.y);
  }
  ABXRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIRW(cpu, cpu.x);
  }
  ABYRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance._ABIRW(cpu, cpu.y);
  }
  IZX(cpu: Nes6502) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc); // read operand
      cpu.addressingModes.operandString =
        '($' + cpu._t.toString(16).padStart(2, '0').toUpperCase() + ',X)';
    });
    cpu.microCodeStack.push(() => {
      temp = (cpu._t + cpu.x) & 0xff; // add x to operand with zero page wraparound
      cpu.read(cpu._t & 0xff); // read from zero page (the cpu uses this to latch the address for the next read)
    });
    cpu.microCodeStack.push(() => {
      cpu.read(temp); // read lo byte from zero page + x
      cpu.addressingModes.operandString += ` @ ${temp
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;
      cpu.pc++;
    });
    cpu.microCodeStack.push(() => {
      temp = cpu._t; // save lo byte
      cpu.read((cpu.bus.addr + 1) & 0xff); // read hi byte from zero page + x + 1 (wrapping)
    });
    cpu.microCodeStack.push(() => {
      const effectiveAddr = (cpu._t << 8) | temp;
      const padding = effectiveAddr > 0xff ? 4 : 2;
      cpu.addressingModes.operandString += ` = ${((cpu._t << 8) | temp)
        .toString(16)
        .padStart(padding, '0')
        .toUpperCase()}`;
      cpu.read(effectiveAddr); // read from effective address
      cpu.addressingModes.operandString += ` = ${cpu._t
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;
    });
  }
  IZXRW(cpu: Nes6502) {
    Nes6502AddressingModes.instance.IZX(cpu);
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, undefined);
    });
  }
  IZY(cpu: Nes6502) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      temp = cpu._t;
      cpu.read(cpu._t);
    });
    cpu.microCodeStack.push(() => {
      const lo = cpu._t + cpu.y;
      cpu.read((temp + 1) & 0xff);
      temp = lo;
    });
    const op = cpu.fetch?.operation;
    if (op === cpu.STA || op === cpu.SAX) {
      cpu.microCodeStack.push(() => {
        const hi = cpu._t << 8;
        const lo = temp;
        cpu.read(hi + lo);
      });
      cpu.microCodeStack.push(() => {
        cpu.bus.write(undefined, cpu._t);
      });
      return;
    }
    cpu.microCodeStack.push(() => {
      const hi = cpu._t << 8;
      const lo = temp;
      cpu.read(hi | (lo & 0xff));
      if (lo > 0xff) {
        cpu.microCodeStack.unshift(() => {
          cpu.read(hi + lo);
        });
      }
    });
  }
  IZYW(cpu: Nes6502) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc);
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu._t);
    });
    cpu.microCodeStack.push(() => {
      temp = cpu._t + cpu.y;
      cpu.read((cpu._t + 1) & 0xff);
    });
    cpu.microCodeStack.push(() => {
      const hi = cpu._t << 8;
      const lo = temp;
      cpu.read(hi + lo);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, cpu._t);
    });
  }
  IZYRW(cpu: Nes6502) {
    let temp = 0;
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu.pc); // read operand
      cpu.addressingModes.operandString = `($${cpu._t
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()},Y)`;
    });
    cpu.microCodeStack.push(() => {
      cpu.pc++;
      cpu.read(cpu._t & 0xff); // read from zero page
    });
    cpu.microCodeStack.push(() => {
      temp = cpu._t + cpu.y;
      cpu.read((cpu.bus.addr + 1) & 0xff); // read hi byte from zero page + 1 (wrapping)
    });
    cpu.microCodeStack.push(() => {
      const hi = cpu._t << 8;
      const lo = temp;
      const effectiveAddr = hi + lo;
      cpu.read(effectiveAddr); // read from effective address
      const padding = effectiveAddr > 0xff ? 4 : 2;
      cpu.addressingModes.operandString += ` = ${effectiveAddr
        .toString(16)
        .padStart(padding, '0')
        .toUpperCase()}`;
      cpu.addressingModes.operandString += ` = ${cpu._t
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;
    });
    cpu.microCodeStack.push(() => {
      cpu.read(undefined);
    });
    cpu.microCodeStack.push(() => {
      cpu.bus.write(undefined, cpu._t);
    });
  }
}
