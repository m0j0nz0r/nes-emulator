import { Nes6502 } from './nes6502';

export class Nes6502AddressingModes {
    private cpu: Nes6502;

    constructor(cpu: Nes6502) {
        this.cpu = cpu;
    }

    NUL() {} // Dummy Instruction/Adressing mode.
    IMP() { // Implied
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.data = this.cpu.a;
            this.cpu.pc++;
        });
    }
    IMM() { // Immediate            #v
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
            this.cpu.pc++;
        });
    }
    ZP0() { // Zero Page            d
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.read(this.cpu.bus.data & 0xff);
            this.cpu.pc++;
        });
    }
    ZP0RW() {
        this.ZP0();
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    private _ZPI(reg: number) {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu._t = this.cpu.bus.data + reg;
        });
        this.cpu.microCodeStack.push(() => this.cpu.bus.read(this.cpu._t & 0xff));
    }
    private _ZPIRW(reg: number) {
        this._ZPI(reg);
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    ZPX() {
        this._ZPI(this.cpu.x);
    }
    ZPY() {
        this._ZPI(this.cpu.y);
    }
    ZPXRW() {
        this._ZPIRW(this.cpu.x);
    }
    ZPYRW() {
        this._ZPIRW(this.cpu.y);
    }
    ABS() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
            this.cpu.pc++;
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.absRead();
        });
    }
    ABSRW() {
        this.ABS();
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    REL() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
    }
    IND() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.read((this.cpu.bus.data << 8) | this.cpu._t);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.bus.read((this.cpu.bus.addr & 0xff00) | ((this.cpu.bus.addr + 1) & 0xff));
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.absRead();
        });
    }
    private _ABIR(reg: number) {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        const op = this.cpu.fetch?.name || '';
        if (['STA', 'STX', 'STY', 'SHA', 'SHX', 'SHY'].includes(op)) {
            this.cpu.microCodeStack.push(() => {
                const lo = this.cpu._t + reg;
                const hi = this.cpu.bus.data << 8;
                this.cpu.bus.read(hi + (lo & 0xff));
                this.cpu.pc++;
                this.cpu.microCodeStack.unshift(() => {
                    this.cpu.bus.write(hi + lo, this.cpu.bus.data);
                });
            });
            return;
        }
        this.cpu.microCodeStack.push(() => {
            const lo = this.cpu._t + reg;
            const hi = this.cpu.bus.data << 8;
            this.cpu.bus.read(hi + (lo & 0xff));
            if (lo > 0xff) {
                this.cpu.microCodeStack.unshift(() => this.cpu.bus.read(hi + lo));
            }
            this.cpu.pc++;
        });
    }
    private _ABIW(reg: number) {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            const lo = this.cpu._t + reg;
            const hi = this.cpu.bus.data << 8;
            this.cpu.bus.read(hi + (lo & 0xff));
            this.cpu.pc++;
            this.cpu.microCodeStack.unshift(() => {
                this.cpu.bus.write(hi + lo, this.cpu.bus.data);
            });
        });
    }
    private _ABIRW(reg: number) {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            const lo = this.cpu._t + reg;
            const hi = this.cpu.bus.data << 8;
            this.cpu.bus.read(hi + (lo & 0xff));
            this.cpu.microCodeStack.unshift(() => this.cpu.bus.read(hi + lo));
            this.cpu.pc++;
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    ABXR() {
        this._ABIR(this.cpu.x);
    }
    ABYR() {
        this._ABIR(this.cpu.y);
    }
    ABXW() {
        this._ABIW(this.cpu.x);
    }
    ABYW() {
        this._ABIW(this.cpu.y);
    }
    ABXRW() {
        this._ABIRW(this.cpu.x);
    }
    ABYRW() {
        this._ABIRW(this.cpu.y);
    }
    IZX() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => this.cpu.bus.read(this.cpu.bus.data & 0xff));
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.read((this.cpu.bus.addr + this.cpu.x) & 0xff);
            this.cpu.pc++;
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data;
            this.cpu.bus.read((this.cpu.bus.addr + 1) & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.read((this.cpu.bus.data << 8) + this.cpu._t);
        });
    }
    IZXRW() {
        this.IZX();
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    IZY() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.bus.data & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data + this.cpu.y;
            this.cpu.bus.read((this.cpu.bus.addr + 1) & 0xff);
        });
        const op = this.cpu.fetch?.operation;
        if (op === this.cpu.STA || op === this.cpu.SAX) {
            this.cpu.microCodeStack.push(() => {
                const hi = this.cpu.bus.data << 8;
                const lo = this.cpu._t;
                this.cpu.bus.read(hi + lo);
            });
            this.cpu.microCodeStack.push(() => {
                this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
            });
            return;
        }
        this.cpu.microCodeStack.push(() => {
            const hi = this.cpu.bus.data << 8;
            const lo = this.cpu._t;
            this.cpu.bus.read(hi | (lo & 0xff));
            if (lo > 0xff) {
                this.cpu.microCodeStack.unshift(() => {
                    this.cpu.bus.read(hi + lo);
                });
            }
        });
    }
    IZYW() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.bus.data & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data + this.cpu.y;
            this.cpu.bus.read((this.cpu.bus.addr + 1) & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            const hi = this.cpu.bus.data << 8;
            const lo = this.cpu._t;
            this.cpu.bus.read(hi + lo);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
    IZYRW() {
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.pc);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.pc++;
            this.cpu.bus.read(this.cpu.bus.data & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu._t = this.cpu.bus.data + this.cpu.y;
            this.cpu.bus.read((this.cpu.bus.addr + 1) & 0xff);
        });
        this.cpu.microCodeStack.push(() => {
            const hi = this.cpu.bus.data << 8;
            const lo = this.cpu._t;
            this.cpu.bus.read(hi + lo);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.read(this.cpu.bus.addr);
        });
        this.cpu.microCodeStack.push(() => {
            this.cpu.bus.write(this.cpu.bus.addr, this.cpu.bus.data);
        });
    }
}
