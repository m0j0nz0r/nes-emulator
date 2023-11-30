"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nes6502 = void 0;
var Flags;
(function (Flags) {
    Flags[Flags["C"] = 1] = "C";
    Flags[Flags["Z"] = 2] = "Z";
    Flags[Flags["I"] = 4] = "I";
    Flags[Flags["D"] = 8] = "D";
    Flags[Flags["B"] = 16] = "B";
    Flags[Flags["U"] = 32] = "U";
    Flags[Flags["V"] = 64] = "V";
    Flags[Flags["N"] = 128] = "N"; // negative
})(Flags || (Flags = {}));
class nes6502 {
    constructor(bus) {
        this._t = 0; // temporary private register to store bytes between cycles
        this.clockSpeed = 21441960; // hz
        this._a = 0x0; // accumulator register
        this._x = 0x0; // X register
        this._y = 0x0; // Y register
        this._sp = 0xfd;
        this.pc = 0x0; // program counter
        this._p = 0x24 | Flags.U | Flags.I; // status register
        this.microCodeStack = []; // currently executing micro code
        this.opCodeLookup = [
            // 00
            { name: 'BRK', operation: this.BRK, addressingMode: this.IMP },
            { name: 'ORA', operation: this.ORA, addressingMode: this.IZX },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'SLO', operation: this.SLO, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0 },
            { name: 'ORA', operation: this.ORA, addressingMode: this.ZP0 },
            { name: 'ASL', operation: this.ASL, addressingMode: this.ZP0 },
            { name: 'SLO', operation: this.SLO, addressingMode: this.ZP0 },
            { name: 'PHP', operation: this.PHP, addressingMode: this.IMP },
            { name: 'ORA', operation: this.ORA, addressingMode: this.IMM },
            { name: 'ASL', operation: this.ASL, addressingMode: this.IMP },
            { name: 'ANC', operation: this.ANC, addressingMode: this.IMM },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABS },
            { name: 'ORA', operation: this.ORA, addressingMode: this.ABS },
            { name: 'ASL', operation: this.ASL, addressingMode: this.ABS },
            { name: 'SLO', operation: this.SLO, addressingMode: this.ABS },
            // 10
            { name: 'BPL', operation: this.BPL, addressingMode: this.REL },
            { name: 'ORA', operation: this.ORA, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'SLO', operation: this.SLO, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'ORA', operation: this.ORA, addressingMode: this.ZPX },
            { name: 'ASL', operation: this.ASL, addressingMode: this.ZPX },
            { name: 'SLO', operation: this.SLO, addressingMode: this.ZPX },
            { name: 'CLC', operation: this.CLC, addressingMode: this.IMP },
            { name: 'ORA', operation: this.ORA, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'SLO', operation: this.SLO, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'ORA', operation: this.ORA, addressingMode: this.ABX },
            { name: 'ASL', operation: this.ASL, addressingMode: this.ABX },
            { name: 'SLO', operation: this.SLO, addressingMode: this.ABX },
            // 20
            { name: 'JSR', operation: this.JSR, addressingMode: this.NUL },
            { name: 'AND', operation: this.AND, addressingMode: this.IZX },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'RLA', operation: this.RLA, addressingMode: this.IZX },
            { name: 'BIT', operation: this.BIT, addressingMode: this.ZP0 },
            { name: 'AND', operation: this.AND, addressingMode: this.ZP0 },
            { name: 'ROL', operation: this.ROL, addressingMode: this.ZP0 },
            { name: 'RLA', operation: this.RLA, addressingMode: this.ZP0 },
            { name: 'PLP', operation: this.PLP, addressingMode: this.IMP },
            { name: 'AND', operation: this.AND, addressingMode: this.IMM },
            { name: 'ROL', operation: this.ROL, addressingMode: this.IMP },
            { name: 'ANC', operation: this.ANC, addressingMode: this.IMM },
            { name: 'BIT', operation: this.BIT, addressingMode: this.ABS },
            { name: 'AND', operation: this.AND, addressingMode: this.ABS },
            { name: 'ROL', operation: this.ROL, addressingMode: this.ABS },
            { name: 'RLA', operation: this.RLA, addressingMode: this.ABS },
            // 30
            { name: 'BMI', operation: this.BMI, addressingMode: this.REL },
            { name: 'AND', operation: this.AND, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'RLA', operation: this.RLA, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'AND', operation: this.AND, addressingMode: this.ZPX },
            { name: 'ROL', operation: this.ROL, addressingMode: this.ZPX },
            { name: 'RLA', operation: this.RLA, addressingMode: this.ZPX },
            { name: 'SEC', operation: this.SEC, addressingMode: this.IMP },
            { name: 'AND', operation: this.AND, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'RLA', operation: this.RLA, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'AND', operation: this.AND, addressingMode: this.ABX },
            { name: 'ROL', operation: this.ROL, addressingMode: this.ABX },
            { name: 'RLA', operation: this.RLA, addressingMode: this.ABX },
            // 40
            { name: 'RTI', operation: this.RTI, addressingMode: this.IMM },
            { name: 'EOR', operation: this.EOR, addressingMode: this.IZX },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'SRE', operation: this.SRE, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0 },
            { name: 'EOR', operation: this.EOR, addressingMode: this.ZP0 },
            { name: 'LSR', operation: this.LSR, addressingMode: this.ZP0 },
            { name: 'SRE', operation: this.SRE, addressingMode: this.ZP0 },
            { name: 'PHA', operation: this.PHA, addressingMode: this.IMP },
            { name: 'EOR', operation: this.EOR, addressingMode: this.IMM },
            { name: 'LSR', operation: this.LSR, addressingMode: this.IMP },
            { name: 'ALR', operation: this.ALR, addressingMode: this.IMM },
            { name: 'JMP', operation: this.JMP, addressingMode: this.ABS },
            { name: 'EOR', operation: this.EOR, addressingMode: this.ABS },
            { name: 'LSR', operation: this.LSR, addressingMode: this.ABS },
            { name: 'SRE', operation: this.SRE, addressingMode: this.ABS },
            // 50
            { name: 'BVC', operation: this.BVC, addressingMode: this.REL },
            { name: 'EOR', operation: this.EOR, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'SRE', operation: this.SRE, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'EOR', operation: this.EOR, addressingMode: this.ZPX },
            { name: 'LSR', operation: this.LSR, addressingMode: this.ZPX },
            { name: 'SRE', operation: this.SRE, addressingMode: this.ZPX },
            { name: 'CLI', operation: this.CLI, addressingMode: this.IMP },
            { name: 'EOR', operation: this.EOR, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'SRE', operation: this.SRE, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'EOR', operation: this.EOR, addressingMode: this.ABX },
            { name: 'LSR', operation: this.LSR, addressingMode: this.ABX },
            { name: 'SRE', operation: this.SRE, addressingMode: this.ABX },
            // 60
            { name: 'RTS', operation: this.RTS, addressingMode: this.IMP },
            { name: 'ADC', operation: this.ADC, addressingMode: this.IZX },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'RRA', operation: this.RRA, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0 },
            { name: 'ADC', operation: this.ADC, addressingMode: this.ZP0 },
            { name: 'ROR', operation: this.ROR, addressingMode: this.ZP0 },
            { name: 'ARR', operation: this.ARR, addressingMode: this.ZP0 },
            { name: 'PLA', operation: this.PLA, addressingMode: this.IMP },
            { name: 'ADC', operation: this.ADC, addressingMode: this.IMM },
            { name: 'ROR', operation: this.ROR, addressingMode: this.IMP },
            { name: 'ARR', operation: this.ARR, addressingMode: this.IMM },
            { name: 'JMP', operation: this.JMP, addressingMode: this.IND },
            { name: 'ADC', operation: this.ADC, addressingMode: this.ABS },
            { name: 'ROR', operation: this.ROR, addressingMode: this.ABS },
            { name: 'RRA', operation: this.RRA, addressingMode: this.ABS },
            // 70
            { name: 'BVS', operation: this.BVS, addressingMode: this.REL },
            { name: 'ADC', operation: this.ADC, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'RRA', operation: this.RRA, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'ADC', operation: this.ADC, addressingMode: this.ZPX },
            { name: 'ROR', operation: this.ROR, addressingMode: this.ZPX },
            { name: 'RRA', operation: this.RRA, addressingMode: this.ZPX },
            { name: 'SEI', operation: this.SEI, addressingMode: this.IMP },
            { name: 'ADC', operation: this.ADC, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'RRA', operation: this.RRA, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'ADC', operation: this.ADC, addressingMode: this.ABX },
            { name: 'ROR', operation: this.ROR, addressingMode: this.ABX },
            { name: 'RRA', operation: this.RRA, addressingMode: this.ABX },
            // 80
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMM },
            { name: 'STA', operation: this.STA, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMM },
            { name: 'SAX', operation: this.SAX, addressingMode: this.IZX },
            { name: 'STY', operation: this.STY, addressingMode: this.ZP0 },
            { name: 'STA', operation: this.STA, addressingMode: this.ZP0 },
            { name: 'STX', operation: this.STX, addressingMode: this.ZP0 },
            { name: 'SAX', operation: this.SAX, addressingMode: this.ZP0 },
            { name: 'DEY', operation: this.DEY, addressingMode: this.IMP },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMM },
            { name: 'TXA', operation: this.TXA, addressingMode: this.IMP },
            { name: 'XAA', operation: this.XAA, addressingMode: this.IMM },
            { name: 'STY', operation: this.STY, addressingMode: this.ABS },
            { name: 'STA', operation: this.STA, addressingMode: this.ABS },
            { name: 'STX', operation: this.STX, addressingMode: this.ABS },
            { name: 'SAX', operation: this.SAX, addressingMode: this.ABS },
            // 90
            { name: 'BCC', operation: this.BCC, addressingMode: this.REL },
            { name: 'STA', operation: this.STA, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'AHX', operation: this.AHX, addressingMode: this.IZY },
            { name: 'STY', operation: this.STY, addressingMode: this.ZPX },
            { name: 'STA', operation: this.STA, addressingMode: this.ZPX },
            { name: 'STX', operation: this.STX, addressingMode: this.ZPY },
            { name: 'SAX', operation: this.SAX, addressingMode: this.ZPY },
            { name: 'TYA', operation: this.TYA, addressingMode: this.IMP },
            { name: 'STA', operation: this.STA, addressingMode: this.ABY },
            { name: 'TXS', operation: this.TXS, addressingMode: this.IMP },
            { name: 'TAS', operation: this.TAS, addressingMode: this.ABY },
            { name: 'SHY', operation: this.SHY, addressingMode: this.ABX },
            { name: 'STA', operation: this.STA, addressingMode: this.ABX },
            { name: 'SHX', operation: this.SHX, addressingMode: this.ABY },
            { name: 'AHX', operation: this.AHX, addressingMode: this.ABY },
            // A0
            { name: 'LDY', operation: this.LDY, addressingMode: this.IMM },
            { name: 'LDA', operation: this.LDA, addressingMode: this.IZX },
            { name: 'LDX', operation: this.LDX, addressingMode: this.IMM },
            { name: 'LAX', operation: this.LAX, addressingMode: this.IZX },
            { name: 'LDY', operation: this.LDY, addressingMode: this.ZP0 },
            { name: 'LDA', operation: this.LDA, addressingMode: this.ZP0 },
            { name: 'LDX', operation: this.LDX, addressingMode: this.ZP0 },
            { name: 'LAX', operation: this.LAX, addressingMode: this.ZP0 },
            { name: 'TAY', operation: this.TAY, addressingMode: this.IMP },
            { name: 'LDA', operation: this.LDA, addressingMode: this.IMM },
            { name: 'TAX', operation: this.TAX, addressingMode: this.IMP },
            { name: 'LAX', operation: this.LAX, addressingMode: this.IMM },
            { name: 'LDY', operation: this.LDY, addressingMode: this.ABS },
            { name: 'LDA', operation: this.LDA, addressingMode: this.ABS },
            { name: 'LDX', operation: this.LDX, addressingMode: this.ABS },
            { name: 'LAX', operation: this.LAX, addressingMode: this.ABS },
            // B0
            { name: 'BCS', operation: this.BCS, addressingMode: this.REL },
            { name: 'LDA', operation: this.LDA, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'LAX', operation: this.LAX, addressingMode: this.IZY },
            { name: 'LDY', operation: this.LDY, addressingMode: this.ZPX },
            { name: 'LDA', operation: this.LDA, addressingMode: this.ZPX },
            { name: 'LDX', operation: this.LDX, addressingMode: this.ZPY },
            { name: 'LAX', operation: this.LAX, addressingMode: this.ZPY },
            { name: 'CLV', operation: this.CLV, addressingMode: this.IMP },
            { name: 'LDA', operation: this.LDA, addressingMode: this.ABY },
            { name: 'TSX', operation: this.TSX, addressingMode: this.IMP },
            { name: 'LAS', operation: this.LAS, addressingMode: this.ABY },
            { name: 'LDY', operation: this.LDY, addressingMode: this.ABX },
            { name: 'LDA', operation: this.LDA, addressingMode: this.ABX },
            { name: 'LDX', operation: this.LDX, addressingMode: this.ABY },
            { name: 'LAX', operation: this.LAX, addressingMode: this.ABY },
            // C0
            { name: 'CPY', operation: this.CPY, addressingMode: this.IMM },
            { name: 'CMP', operation: this.CMP, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMM },
            { name: 'DCP', operation: this.DCP, addressingMode: this.IZX },
            { name: 'CPY', operation: this.CPY, addressingMode: this.ZP0 },
            { name: 'CMP', operation: this.CMP, addressingMode: this.ZP0 },
            { name: 'DEC', operation: this.DEC, addressingMode: this.ZP0 },
            { name: 'DCP', operation: this.DCP, addressingMode: this.ZP0 },
            { name: 'INY', operation: this.INY, addressingMode: this.IMP },
            { name: 'CMP', operation: this.CMP, addressingMode: this.IMM },
            { name: 'DEX', operation: this.DEX, addressingMode: this.IMP },
            { name: 'AXS', operation: this.AXS, addressingMode: this.IMM },
            { name: 'CPY', operation: this.CPY, addressingMode: this.ABS },
            { name: 'CMP', operation: this.CMP, addressingMode: this.ABS },
            { name: 'DEC', operation: this.DEC, addressingMode: this.ABS },
            { name: 'SCP', operation: this.DCP, addressingMode: this.ABS },
            // D0
            { name: 'BNE', operation: this.BNE, addressingMode: this.REL },
            { name: 'CMP', operation: this.CMP, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'DCP', operation: this.DCP, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'CMP', operation: this.CMP, addressingMode: this.ZPX },
            { name: 'DEC', operation: this.DEC, addressingMode: this.ZPX },
            { name: 'DCP', operation: this.DCP, addressingMode: this.ZPX },
            { name: 'CLD', operation: this.CLD, addressingMode: this.IMP },
            { name: 'CMP', operation: this.CMP, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'DCP', operation: this.DCP, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'CMP', operation: this.CMP, addressingMode: this.ABX },
            { name: 'DEC', operation: this.DEC, addressingMode: this.ABX },
            { name: 'DCP', operation: this.DCP, addressingMode: this.ABX },
            // E0
            { name: 'CPX', operation: this.CPX, addressingMode: this.IMM },
            { name: 'SBC', operation: this.SBC, addressingMode: this.IZX },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMM },
            { name: 'ISC', operation: this.ISC, addressingMode: this.IZX },
            { name: 'CPX', operation: this.CPX, addressingMode: this.ZP0 },
            { name: 'SBC', operation: this.SBC, addressingMode: this.ZP0 },
            { name: 'INC', operation: this.INC, addressingMode: this.ZP0 },
            { name: 'ISC', operation: this.ISC, addressingMode: this.ZP0 },
            { name: 'INX', operation: this.INX, addressingMode: this.IMP },
            { name: 'SBC', operation: this.SBC, addressingMode: this.IMM },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'SBC', operation: this.SBC, addressingMode: this.IMM },
            { name: 'CPX', operation: this.CPX, addressingMode: this.ABS },
            { name: 'SBC', operation: this.SBC, addressingMode: this.ABS },
            { name: 'INC', operation: this.INC, addressingMode: this.ABS },
            { name: 'ISC', operation: this.ISC, addressingMode: this.ABS },
            // F0
            { name: 'BEQ', operation: this.BEQ, addressingMode: this.REL },
            { name: 'SBC', operation: this.SBC, addressingMode: this.IZY },
            { name: 'STP', operation: this.STP, addressingMode: this.IMP },
            { name: 'ISC', operation: this.ISC, addressingMode: this.IZY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX },
            { name: 'SBC', operation: this.SBC, addressingMode: this.ZPX },
            { name: 'INC', operation: this.INC, addressingMode: this.ZPX },
            { name: 'ISC', operation: this.ISC, addressingMode: this.ZPX },
            { name: 'SED', operation: this.SED, addressingMode: this.IMP },
            { name: 'SBC', operation: this.SBC, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.IMP },
            { name: 'ISC', operation: this.ISC, addressingMode: this.ABY },
            { name: 'NOP', operation: this.NOP, addressingMode: this.ABX },
            { name: 'SBC', operation: this.SBC, addressingMode: this.ABX },
            { name: 'INC', operation: this.INC, addressingMode: this.ABX },
            { name: 'ISC', operation: this.ISC, addressingMode: this.ABX }, // FF
        ];
        this.count = 0;
        this._bus = bus;
    }
    get a() {
        return this._a;
    }
    set a(v) {
        this._a = v & 0xff;
    }
    get x() {
        return this._x;
    }
    set x(v) {
        this._x = v & 0xff;
    }
    get y() {
        return this._y;
    }
    set y(v) {
        this._y = v & 0xff;
    }
    get stackPointer() {
        return this._sp;
    }
    set stackPointer(v) {
        this._sp = v & 0xff;
    }
    get status() {
        return this._p;
    }
    set status(v) {
        this._p = (v & 0xff) | Flags.U;
    }
    // Addressing Modes
    NUL() { } // Dummy Instruction/Adressing mode.
    IMP() {
        // Some operations state implied in the data sheet, but act on the accumulator.
        this.ACC();
    }
    ACC() {
        this.microCodeStack.push(() => {
            this._bus.data = this.a;
            this.pc++;
        });
    }
    IMM() {
        // fetch value
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
    }
    ZP0() {
        // fetch address
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        // fetch value from address
        this.microCodeStack.push(() => {
            this._bus.read(this._bus.data & 0xff);
            this.pc++;
        });
    }
    _ZPI(reg) {
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        // TODO: check that this is how the 6502 behaves, previous supposition was that we could store the result
        // of this operation in the address bus.
        this.microCodeStack.push(() => this._t = this._bus.data + reg);
        this.microCodeStack.push(() => this._bus.read(this._t & 0xff));
    }
    ZPX() {
        this._ZPI(this.x);
    }
    ZPY() {
        this._ZPI(this.y);
    }
    ABS() {
        // next two bytes, lo byte first.
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        // the operation can get the address with this._t + (this._bus.data << 8)
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
        });
    }
    REL() {
        // this is only used for branching.
        // we can only branch within the same page.
        // we will allow the branching instructions do the actual addressing
        // which is how it seems to be done in the actual hardware.
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
    }
    IND() {
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => this._bus.read(this._t + (this._bus.data << 8)));
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            // when fetching from an address at the edge of a page, the 6502 will fetch the hi byte from the beggining of the same page
            this._bus.read((this._bus.addr & 0xff00) + ((this._bus.addr + 1) & 0xff));
            this.pc++;
        });
    }
    _ABI(reg) {
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            const lo = this._t + reg;
            const hi = this._bus.data << 8;
            this._bus.read(hi + (lo & 0xff));
            // on page change, add extra cycle to update the hi byte in the bus.
            if (lo > 0xff) {
                this.microCodeStack.push(() => this._bus.read(hi + lo));
            }
            this.pc++;
        });
    }
    ABX() {
        this._ABI(this.x);
    }
    ABY() {
        this._ABI(this.y);
    }
    IZX() {
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        // the 6502 first reads from arg on page 0, apparently using the address bus to store the value before adding the x register.
        this.microCodeStack.push(() => this._bus.read(this._bus.data & 0xff));
        this.microCodeStack.push(() => {
            this._bus.read((this._bus.addr + this.x) & 0xff);
            this.pc++;
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this._bus.read((this._bus.addr + 1) & 0xff);
        });
        this.microCodeStack.push(() => {
            this._bus.read((this._bus.data << 8) + this._t);
            this.pc++;
        });
    }
    IZY() {
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => this._bus.read(this._t + (this._bus.data << 8)));
        this.microCodeStack.push(() => {
            const hi = this._bus.addr & 0xff00;
            const lo = (this._bus.addr & 0xff) + this.y;
            this._bus.read(hi + (lo & 0xff));
            if (lo > 0xff) {
                this.microCodeStack.push(() => this._bus.read(hi + lo));
            }
            this.pc++;
        });
    }
    // Operations
    ADC() {
        this.microCodeStack.push(() => {
            const m = this.a;
            const n = this._bus.data;
            const result = m + n + this.getFlag(Flags.C);
            this.a = result & 0xff;
            this.setFlag(Flags.C, result & 0x100);
            // formula taken from http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
            this.setFlag(Flags.V, (m ^ result) & (n ^ result) & 0x80);
            this.testNZFlags(result);
            this.pc++;
        });
    }
    SBC() {
        // substraction works the same as addition with flipped bits on the second argument
        this._bus.data = ~this._bus.data;
        this.ADC();
    }
    AND() {
        this.microCodeStack.push(() => {
            this.a &= this._bus.data;
            this.testNZFlags(this.a);
            this.pc++;
        });
    }
    ASL() {
        var _b;
        let result = 0;
        const p = this;
        function setFlags(result) {
            p.setFlag(Flags.N, result & 0x80); // test bit 7
            p.setFlag(Flags.Z, !result);
            p.setFlag(Flags.C, result & 0x100); // test bit 8
        }
        if (((_b = this._fetch) === null || _b === void 0 ? void 0 : _b.addressingMode) === this.ACC) {
            this.microCodeStack.push(() => {
                result = this.a << 1;
                this.a = result & 0xff;
                setFlags(result);
            });
        }
        else {
            result = this._bus.data << 1;
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, result && 0xff);
                setFlags(result);
            });
            this.NOP(); // allow the result to be saved before fetching the next instruction.
        }
    }
    LSR() {
        var _b;
        if (((_b = this._fetch) === null || _b === void 0 ? void 0 : _b.addressingMode) === this.ACC) {
            this.microCodeStack.push(() => {
                this.setFlag(Flags.C, this.a & 0x1);
                this.a = this.a >> 1;
                this.testNZFlags(this.a);
            });
        }
        else {
            this.microCodeStack.push(() => {
                const result = this._bus.data >> 1;
                this.setFlag(Flags.C, this._bus.data & 0x1);
                this.testNZFlags(result);
                this._bus.write(this._bus.addr, result);
            });
            this.NOP();
        }
    }
    BIT() {
        this.microCodeStack.push(() => {
            this.setFlag(Flags.N, this._bus.data & 0x80); // test bit 7
            this.setFlag(Flags.Z, !(this._bus.data & this.a));
            this.setFlag(Flags.V, this._bus.data & 0x40); // test bit 6
        });
    }
    _BRA(shouldBranch) {
        this.microCodeStack.push(() => {
            this.pc++;
            if (shouldBranch) {
                const hi = this.pc & 0xff00;
                const lo = (this.pc & 0xff) + this._bus.data;
                // +1 cycle if branch taken
                this.microCodeStack.push(() => this.pc = hi | (lo & 0xff));
                // +1 cycle if branch crosses page boundary
                if (lo > 0xff) {
                    this.microCodeStack.push(() => this.pc = hi + lo);
                }
            }
        });
    }
    BPL() {
        this._BRA(this.getFlag(Flags.N) === 0);
    }
    BMI() {
        this._BRA(this.getFlag(Flags.N) === 1);
    }
    BVC() {
        this.microCodeStack.push(() => {
            this.pc++;
            if (this.getFlag(Flags.V) === 0) {
                const hi = this.pc & 0xff00;
                const lo = (this.pc & 0xff) + this._bus.data;
                this.microCodeStack.push(() => this.pc = hi + (lo & 0xff));
                this.microCodeStack.push(() => this.pc = hi + lo);
                // BVC always takes 3 cycles if branch is taken.
            }
        });
    }
    BVS() {
        this._BRA(this.getFlag(Flags.V) === 1);
    }
    BCC() {
        this._BRA(this.getFlag(Flags.C) === 0);
    }
    BCS() {
        this._BRA(this.getFlag(Flags.C) === 1);
    }
    BNE() {
        this._BRA(this.getFlag(Flags.Z) === 0);
    }
    BEQ() {
        this._BRA(this.getFlag(Flags.Z) === 1);
    }
    BRK() {
        /*
        
        #  address R/W description
       --- ------- --- -----------------------------------------------
        1    PC     R  fetch opcode, increment PC
        2    PC     R  read next instruction byte (and throw it away),
                       increment PC
        3  $0100,S  W  push PCH on stack, decrement S
        4  $0100,S  W  push PCL on stack, decrement S
        5  $0100,S  W  push P on stack (with B flag set), decrement S
        6   $FFFE   R  fetch PCL
        7   $FFFF   R  fetch PCH
        */
        // first cycle is done by clock.
        // second cycle done by addr mode.
        this.microCodeStack.push(() => {
            this._bus.write(0x100 | this.stackPointer, this.pc >> 8);
            this.stackPointer--;
        });
        this.microCodeStack.push(() => {
            this._bus.write(this.stackPointer, this.pc & 0xff);
            this.stackPointer--;
        });
        this.microCodeStack.push(() => {
            this._bus.write(this.stackPointer, this.status);
            this.stackPointer--;
            this.setFlag(Flags.B, 1);
        });
        this.microCodeStack.push(() => {
            this._bus.read(0xfffe);
        });
        this.microCodeStack.push(() => {
            this.pc = this._bus.data;
            this._bus.read(0xffff);
        });
        this.microCodeStack.push(() => {
            this.pc |= this._bus.data << 8;
        });
        throw new Error('Break!');
    }
    _CPA(reg) {
        this.microCodeStack.push(() => {
            const m = reg;
            const n = this._bus.data ^ 0xff;
            const result = m + n + 1;
            this.setFlag(Flags.C, result & 0x100);
            this.testNZFlags(result);
            this.pc++;
        });
    }
    CMP() {
        this._CPA(this.a);
    }
    CPX() {
        this._CPA(this.x);
    }
    CPY() {
        this._CPA(this.y);
    }
    DEC() {
        this._STO(this._bus.data);
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data--);
            this.testNZFlags(this._bus.data);
        });
        this.microCodeStack.push(() => { }); // allow the cpu to fetch the next instruction.
    }
    INC() {
        this._STO(this._bus.data);
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data++);
            this.testNZFlags(this._bus.data);
        });
        this.microCodeStack.push(() => { }); // allow the cpu to fetch the next instruction.
    }
    EOR() {
        this.microCodeStack.push(() => {
            this.a ^= this._bus.data;
            this.testNZFlags(this.a);
            this.pc++;
        });
    }
    CLC() {
        this.microCodeStack.push(() => this.setFlag(Flags.C, 0));
    }
    SEC() {
        this.microCodeStack.push(() => this.setFlag(Flags.C, 1));
    }
    CLI() {
        this.microCodeStack.push(() => this.setFlag(Flags.I, 0));
    }
    SEI() {
        this.microCodeStack.push(() => this.setFlag(Flags.I, 1));
    }
    CLV() {
        this.microCodeStack.push(() => this.setFlag(Flags.V, 0));
    }
    CLD() {
        this.microCodeStack.push(() => this.setFlag(Flags.D, 0));
    }
    SED() {
        this.microCodeStack.push(() => this.setFlag(Flags.D, 1));
    }
    JMP() {
        this.microCodeStack.push(() => {
            this.pc = this._t | (this._bus.data << 8);
        });
    }
    JSR() {
        // This instruction does additional stuff during addressing.
        // so we are implementing addressing within the instruction.
        // We start from 2nd cycle, as we expect the opcode to have been fetched at this point.
        /*
        #  address R/W description
       --- ------- --- -------------------------------------------------
        1    PC     R  fetch opcode, increment PC
        2    PC     R  fetch low address byte, increment PC
        3  $0100,S  R  internal operation (predecrement S?)
        4  $0100,S  W  push PCH on stack, decrement S
        5  $0100,S  W  push PCL on stack, decrement S
        6    PC     R  copy low address byte to PCL, fetch high address
                       byte to PCH
        */
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this._bus.read(0x100 | this.stackPointer);
            this.stackPointer = this._bus.data;
            this.pc++;
        });
        this.microCodeStack.push(() => {
            this._bus.addr--;
            this._bus.write(this._bus.addr, this.pc >> 8);
        });
        this.microCodeStack.push(() => {
            this._bus.addr--;
            this._bus.write(this._bus.addr, this.pc & 0xff);
        });
        this.microCodeStack.push(() => {
            this._t = this.stackPointer;
            this.stackPointer = this._bus.addr & 0xff;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this.pc = (this._bus.data << 8) | (this._t & 0xff);
        });
    }
    LDA() {
        this.microCodeStack.push(() => {
            this.a = this._bus.data;
            this.testNZFlags(this.a);
            this.pc++;
        });
    }
    LDX() {
        this.microCodeStack.push(() => {
            this.x = this._bus.data;
            this.testNZFlags(this.x);
            this.pc++;
        });
    }
    LDY() {
        this.microCodeStack.push(() => {
            this.y = this._bus.data;
            this.testNZFlags(this.y);
            this.pc++;
        });
    }
    NOP() {
        this.microCodeStack.push(() => { });
    }
    ORA() {
        this.microCodeStack.push(() => {
            this.a |= this._bus.data;
            this.testNZFlags(this.a);
            this.pc++;
        });
    }
    TAX() {
        this.microCodeStack.push(() => {
            this.x = this.a;
            this.testNZFlags(this.x);
        });
    }
    TXA() {
        this.microCodeStack.push(() => {
            this.a = this.x;
            this.testNZFlags(this.a);
        });
    }
    DEX() {
        this.microCodeStack.push(() => {
            this.x--;
            this.testNZFlags(this.x);
        });
    }
    DEY() {
        this.microCodeStack.push(() => {
            this.y--;
            this.testNZFlags(this.y);
        });
    }
    INX() {
        this.microCodeStack.push(() => {
            this.x++;
            this.testNZFlags(this.x);
        });
    }
    INY() {
        this.microCodeStack.push(() => {
            this.y++;
            this.testNZFlags(this.y);
        });
    }
    TAY() {
        this.microCodeStack.push(() => {
            this.y = this.a;
            this.testNZFlags(this.y);
        });
    }
    TYA() {
        this.microCodeStack.push(() => {
            this.a = this.y;
            this.testNZFlags(this.a);
        });
    }
    ROL() {
        var _b;
        const p = this;
        function rotate(v) {
            let result = v << 1;
            // set b0 to the value of the carry flag
            if (p.getFlag(Flags.C)) {
                result |= 0x1;
            }
            else {
                result &= ~0x1;
            }
            // set the carry flag to the value of b7
            p.setFlag(Flags.C, v & 0x80);
            p.testNZFlags(result);
            return result;
        }
        if (((_b = this._fetch) === null || _b === void 0 ? void 0 : _b.addressingMode) === this.ACC) {
            this.microCodeStack.push(() => {
                this.a = rotate(this.a) & 0xff;
            });
        }
        else {
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, rotate(this._bus.data) & 0xff);
            });
            this.NOP();
        }
    }
    ROR() {
        var _b;
        const p = this;
        function rotate(v) {
            let result = v >> 1;
            // set b7 to the value of the carry flag.
            if (p.getFlag(Flags.C)) {
                v |= 0x80;
            }
            else {
                v &= ~0x80;
            }
            // set the carry flag to the value of b0
            p.setFlag(Flags.C, v & 0x1);
            p.testNZFlags(result);
            return result;
        }
        if (((_b = this._fetch) === null || _b === void 0 ? void 0 : _b.addressingMode) === this.ACC) {
            this.microCodeStack.push(() => {
                this.a = rotate(this.a) & 0xff;
            });
        }
        else {
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, rotate(this._bus.data) & 0xff);
            });
            this.NOP();
        }
    }
    RTI() {
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.status = this._bus.data;
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.pc = this._bus.data;
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.pc |= this._bus.data << 8;
        });
    }
    RTS() {
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this._t |= (this._bus.data << 8);
            this._bus.read(this.stackPointer);
        });
        this.microCodeStack.push(() => {
            this.pc = this._t;
            this.pc++;
        });
    }
    _STO(v) {
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, v);
        });
        this.microCodeStack.push(() => { });
    }
    STA() {
        this._STO(this.a);
    }
    STX() {
        this._STO(this.x);
    }
    STY() {
        this._STO(this.y);
    }
    TXS() {
        this.microCodeStack.push(() => {
            this.stackPointer = this.x;
        });
    }
    TSX() {
        this.microCodeStack.push(() => {
            this.x = this.stackPointer;
        });
    }
    PHA() {
        this.microCodeStack.push(() => {
            this.pushStack(this.a);
        });
        this.microCodeStack.push(() => { });
    }
    PLA() {
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.a = this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    PHP() {
        this.microCodeStack.push(() => {
            this.pushStack(this.status);
            this.microCodeStack.push(() => { });
        });
        this.microCodeStack.push(() => { });
    }
    PLP() {
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.status = this._bus.data;
        });
    }
    // Illegal opcodes.
    // Many of these should have bad cycle counts. Fix as needed.
    SLO() {
        this.ASL();
        this.ORA();
    }
    RLA() {
        this.ROL();
        this.AND();
    }
    SRE() {
        this.LSR();
        this.EOR();
    }
    RRA() {
        this.ROR();
        this.ADC();
    }
    SAX() {
        this._STO(this.a & this.x);
    }
    LAX() {
        this.LDA();
        this.LDX();
    }
    DCP() {
        this.DEC();
        this.CMP();
    }
    ISC() {
        this.INC();
        this.SBC();
    }
    ANC() {
        this.microCodeStack.push(() => {
            this.a &= this._bus.data;
            this.setFlag(Flags.C, this.a & 0x80);
        });
    }
    ALR() {
        this.AND();
        this.LSR();
    }
    ARR() {
        this.AND();
        this.ROR();
    }
    XAA() {
        this.microCodeStack.push(() => {
            this.a = this.x & this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    AXS() {
        this.CMP();
        this.DEX();
    }
    AHX() {
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this.a & this.x & (this._bus.addr >> 8));
        });
        this.NOP();
    }
    SHY() {
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this.y & (this._bus.addr >> 8));
        });
        this.NOP();
    }
    SHX() {
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this.x & (this._bus.addr >> 8));
        });
        this.NOP();
    }
    TAS() {
        this.microCodeStack.push(() => {
            this.stackPointer = this.a & this.x;
            this._bus.write(this._bus.addr, this.stackPointer & (this._bus.addr >> 8));
        });
        this.NOP();
    }
    LAS() {
        this.microCodeStack.push(() => {
            this.a = this.x = this.stackPointer = this._bus.data & this.stackPointer;
        });
    }
    STP() {
        this.microCodeStack.push(() => {
            this.STP();
        });
    }
    // Interrupts
    reset() {
        this.microCodeStack.push(() => {
            this.a = 0;
            this.x = 0;
            this.y = 0;
            this.stackPointer = 0xfd;
            this.status = 0x0 | Flags.U;
            this._bus.read(0xfffc);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this._bus.read(0xfffd);
        });
        this.microCodeStack.push(() => {
            this.pc = this._t | (this._bus.data << 8);
        });
    }
    irq() {
        if (this.getFlag(Flags.I)) {
            return;
        }
        this.microCodeStack.push(() => {
            this.pushStack(this.pc >> 8);
        });
        this.microCodeStack.push(() => {
            this.pushStack(this.pc & 0xff);
        });
        this.microCodeStack.push(() => {
            this.setFlag(Flags.B, 0);
            this.setFlag(Flags.U, 1);
            this.setFlag(Flags.I, 1);
            this.pushStack(this.status);
        });
        this.microCodeStack.push(() => {
            this._bus.read(0xfffe);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this._bus.read(0xffff);
        });
        this.microCodeStack.push(() => {
            this.pc = this._t | (this._bus.data >> 8);
        });
    }
    nmi() {
        this.microCodeStack.push(() => {
            this.pushStack(this.pc >> 8);
        });
        this.microCodeStack.push(() => {
            this.pushStack(this.pc & 0xff);
        });
        this.microCodeStack.push(() => {
            this.setFlag(Flags.B, 0);
            this.setFlag(Flags.U, 1);
            this.setFlag(Flags.I, 1);
            this.pushStack(this.status);
        });
        this.microCodeStack.push(() => {
            this._bus.read(0xfffa);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this._bus.read(0xfffb);
        });
        this.microCodeStack.push(() => {
            this.pc = this._t | (this._bus.data >> 8);
        });
    }
    clock() {
        // make a micro code stack
        // running the addressing mode and the operation should
        // add steps to the stack
        // if stack is empty, current data should be an op
        // each item in the stack is 1 cycle
        if (this.microCodeStack.length) {
            const microCode = this.microCodeStack.shift();
            // we check for falsy, although this should never happen.
            microCode && microCode();
            // console.log(`${this._bus.rwFlag} ${this._bus.addr.toString(16)} ${this._bus.data.toString(16)}`);
            // after every op is done, fetch next instruction.
            if (!this.microCodeStack.length) {
                this._bus.read(this.pc);
            }
        }
        else {
            this._fetch = this.opCodeLookup[this._bus.data];
            this.count++;
            let log = '';
            log += this.count.toString().padStart(4, ' ');
            log += ' ' + this._bus.addr.toString(16).toUpperCase().padStart(4, '0');
            log += ' ' + this._bus.data.toString(16).toUpperCase().padStart(2, '0');
            log += ' ' + this._fetch.name;
            log += ' A:' + this.a.toString(16).toUpperCase().padStart(2, '0');
            log += ' X:' + this.x.toString(16).toUpperCase().padStart(2, '0');
            log += ' Y:' + this.y.toString(16).toUpperCase().padStart(2, '0');
            log += ' P:' + this.status.toString(16).toUpperCase().padStart(2, '0');
            log += ' SP:' + this.stackPointer.toString(16).toUpperCase().padStart(2, '0');
            log += ' C:' + this.getFlag(Flags.C);
            log += ' Z:' + this.getFlag(Flags.Z);
            log += ' I:' + this.getFlag(Flags.I);
            log += ' D:' + this.getFlag(Flags.D);
            log += ' B:' + this.getFlag(Flags.B);
            log += ' U:' + this.getFlag(Flags.U);
            log += ' V:' + this.getFlag(Flags.V);
            log += ' N:' + this.getFlag(Flags.N);
            console.log(log);
            this._fetch.addressingMode.call(this);
            this._fetch.operation.call(this);
            const microCode = this.microCodeStack.shift();
            // we check for falsy, although this should never happen.
            microCode && microCode();
        }
    }
    getFlag(flag) {
        return (this.status & flag) != 0 ? 1 : 0;
    }
    setFlag(flag, value) {
        if (value) {
            this.status |= flag; // set bit
        }
        else {
            this.status &= ~flag; // clear bit
        }
    }
    pushStack(value) {
        this.stackPointer--;
        this._bus.write(0x100 | this.stackPointer, value);
    }
    popStack() {
        this._bus.read(0x100 | this.stackPointer);
        this.stackPointer++;
    }
    testNZFlags(v) {
        this.setFlag(Flags.N, v & 0x80);
        this.setFlag(Flags.Z, !(v & 0xff));
    }
}
exports.nes6502 = nes6502;
//# sourceMappingURL=nes6502.js.map