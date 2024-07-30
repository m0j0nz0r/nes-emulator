import { Bus } from './bus';
import { EventHandler, Logger } from './eventHandler';
enum Flags {
    C = (1 << 0), // carry bit
    Z = (1 << 1), // zero
    I = (1 << 2), // disable interrupts
    D = (1 << 3), // decimal mode
    B = (1 << 4), // break
    U = (1 << 5), // unused
    V = (1 << 6), // overflow
    N = (1 << 7)  // negative
}
interface Instruction {
    name: string,
    operation: () => void,
    addressingMode: () => void
}
export class nes6502 extends EventHandler{
    constructor (bus: Bus, logger?: Logger) {
        super(logger);
        this._bus = bus;
    }
    public cycle = 0;
    private _bus: Bus;
    private _t: number = 0; // temporary private register to store bytes between cycles
    public fetch?: Instruction;
    private _getPreviousMicroCode() {
        return this.microCodeStack.pop() || (() => {});
    }

    private _a: number = 0x0; // accumulator register
    get a(): number {
        return this._a;
    }
    set a(v: number) {
        this._a = v & 0xff;
    }
    private _x: number = 0x0; // X register
    get x(): number {
        return this._x;
    }
    set x(v: number) {
        this._x = v & 0xff;
    }
    private _y: number = 0x0; // Y register
    get y(): number {
        return this._y;
    }
    set y(v: number) {
        this._y = v & 0xff;
    }
    private _sp: number = 0xfd;
    get stackPointer(): number {
        return this._sp;
    }
    set stackPointer(v: number) {
        this._sp = v & 0xff;
    }
    pc: number = 0xfffc; // program counter
    private _p: number = 0x24 | Flags.U | Flags.I; // status register
    get status(): number {
        return this._p;
    }
    set status(v: number) {
        this._p = (v & 0xff) | Flags.U;
    }
    microCodeStack: (() => void)[] = []; // currently executing micro code
    opCodeLookup: Instruction[] = 
    [
        // 00
        { name: 'BRK', operation: this.BRK, addressingMode: this.IMP}, // 00
        { name: 'ORA', operation: this.ORA, addressingMode: this.IZX}, // 01
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 02
        { name: 'SLO', operation: this.SLO, addressingMode: this.IZXRW}, // 03

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0}, // 04
        { name: 'ORA', operation: this.ORA, addressingMode: this.ZP0}, // 05
        { name: 'ASL', operation: this.ASL, addressingMode: this.ZP0RW}, // 06
        { name: 'SLO', operation: this.SLO, addressingMode: this.ZP0RW}, // 07

        { name: 'PHP', operation: this.PHP, addressingMode: this.IMP}, // 08
        { name: 'ORA', operation: this.ORA, addressingMode: this.IMM}, // 09
        { name: 'ASL', operation: this.ASL, addressingMode: this.IMP}, // 0A
        { name: 'ANC', operation: this.ANC, addressingMode: this.IMM}, // 0B

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABS}, // 0C
        { name: 'ORA', operation: this.ORA, addressingMode: this.ABS}, // 0D
        { name: 'ASL', operation: this.ASL, addressingMode: this.ABSRW}, // 0E
        { name: 'SLO', operation: this.SLO, addressingMode: this.ABSRW}, // 0F
        
        // 10
        { name: 'BPL', operation: this.BPL, addressingMode: this.REL}, // 10
        { name: 'ORA', operation: this.ORA, addressingMode: this.IZY}, // 11
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 12
        { name: 'SLO', operation: this.SLO, addressingMode: this.IZYRW}, // 13

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // 14
        { name: 'ORA', operation: this.ORA, addressingMode: this.ZPX}, // 15
        { name: 'ASL', operation: this.ASL, addressingMode: this.ZPXRW}, // 16
        { name: 'SLO', operation: this.SLO, addressingMode: this.ZPXRW}, // 17

        { name: 'CLC', operation: this.CLC, addressingMode: this.IMP}, // 18
        { name: 'ORA', operation: this.ORA, addressingMode: this.ABYR}, // 19
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // 1A
        { name: 'SLO', operation: this.SLO, addressingMode: this.ABYRW}, // 1B

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // 1C
        { name: 'ORA', operation: this.ORA, addressingMode: this.ABXR}, // 1D
        { name: 'ASL', operation: this.ASL, addressingMode: this.ABXRW}, // 1E
        { name: 'SLO', operation: this.SLO, addressingMode: this.ABXRW}, // 1F
        
        // 20
        { name: 'JSR', operation: this.JSR, addressingMode: this.NUL}, // 20. JSR will do its own adressing.
        { name: 'AND', operation: this.AND, addressingMode: this.IZX}, // 21
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 22
        { name: 'RLA', operation: this.RLA, addressingMode: this.IZXRW}, // 23

        { name: 'BIT', operation: this.BIT, addressingMode: this.ZP0}, // 24
        { name: 'AND', operation: this.AND, addressingMode: this.ZP0}, // 25
        { name: 'ROL', operation: this.ROL, addressingMode: this.ZP0RW}, // 26
        { name: 'RLA', operation: this.RLA, addressingMode: this.ZP0RW}, // 27

        { name: 'PLP', operation: this.PLP, addressingMode: this.IMP}, // 28
        { name: 'AND', operation: this.AND, addressingMode: this.IMM}, // 29
        { name: 'ROL', operation: this.ROL, addressingMode: this.IMP}, // 2A
        { name: 'ANC', operation: this.ANC, addressingMode: this.IMM}, // 2B

        { name: 'BIT', operation: this.BIT, addressingMode: this.ABS}, // 2C
        { name: 'AND', operation: this.AND, addressingMode: this.ABS}, // 2D
        { name: 'ROL', operation: this.ROL, addressingMode: this.ABSRW}, // 2E
        { name: 'RLA', operation: this.RLA, addressingMode: this.ABSRW}, // 2F
        
        // 30
        { name: 'BMI', operation: this.BMI, addressingMode: this.REL}, // 30
        { name: 'AND', operation: this.AND, addressingMode: this.IZY}, // 31
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 32
        { name: 'RLA', operation: this.RLA, addressingMode: this.IZYRW}, // 33

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // 34
        { name: 'AND', operation: this.AND, addressingMode: this.ZPX}, // 35
        { name: 'ROL', operation: this.ROL, addressingMode: this.ZPXRW}, // 36
        { name: 'RLA', operation: this.RLA, addressingMode: this.ZPXRW}, // 37

        { name: 'SEC', operation: this.SEC, addressingMode: this.IMP}, // 38
        { name: 'AND', operation: this.AND, addressingMode: this.ABYR}, // 39
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // 3A
        { name: 'RLA', operation: this.RLA, addressingMode: this.ABYRW}, // 3B

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // 3C
        { name: 'AND', operation: this.AND, addressingMode: this.ABXR}, // 3D
        { name: 'ROL', operation: this.ROL, addressingMode: this.ABXRW}, // 3E
        { name: 'RLA', operation: this.RLA, addressingMode: this.ABXRW}, // 3F
        
        // 40
        { name: 'RTI', operation: this.RTI, addressingMode: this.IMM}, // 40
        { name: 'EOR', operation: this.EOR, addressingMode: this.IZX}, // 41
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 42
        { name: 'SRE', operation: this.SRE, addressingMode: this.IZXRW}, // 43

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0}, // 44
        { name: 'EOR', operation: this.EOR, addressingMode: this.ZP0}, // 45
        { name: 'LSR', operation: this.LSR, addressingMode: this.ZP0RW}, // 46
        { name: 'SRE', operation: this.SRE, addressingMode: this.ZP0RW}, // 47

        { name: 'PHA', operation: this.PHA, addressingMode: this.IMP}, // 48
        { name: 'EOR', operation: this.EOR, addressingMode: this.IMM}, // 49
        { name: 'LSR', operation: this.LSR, addressingMode: this.IMP}, // 4A
        { name: 'ALR', operation: this.ALR, addressingMode: this.IMM}, // 4B

        { name: 'JMP', operation: this.JMP, addressingMode: this.ABS}, // 4C
        { name: 'EOR', operation: this.EOR, addressingMode: this.ABS}, // 4D
        { name: 'LSR', operation: this.LSR, addressingMode: this.ABSRW}, // 4E
        { name: 'SRE', operation: this.SRE, addressingMode: this.ABSRW}, // 4F
        
        // 50
        { name: 'BVC', operation: this.BVC, addressingMode: this.REL}, // 50
        { name: 'EOR', operation: this.EOR, addressingMode: this.IZY}, // 51
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 52
        { name: 'SRE', operation: this.SRE, addressingMode: this.IZYRW}, // 53

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // 54
        { name: 'EOR', operation: this.EOR, addressingMode: this.ZPX}, // 55
        { name: 'LSR', operation: this.LSR, addressingMode: this.ZPXRW}, // 56
        { name: 'SRE', operation: this.SRE, addressingMode: this.ZPXRW}, // 57

        { name: 'CLI', operation: this.CLI, addressingMode: this.IMP}, // 58
        { name: 'EOR', operation: this.EOR, addressingMode: this.ABYR}, // 59
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // 5A
        { name: 'SRE', operation: this.SRE, addressingMode: this.ABYRW}, // 5B

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // 5C
        { name: 'EOR', operation: this.EOR, addressingMode: this.ABXR}, // 5D
        { name: 'LSR', operation: this.LSR, addressingMode: this.ABXRW}, // 5E
        { name: 'SRE', operation: this.SRE, addressingMode: this.ABXRW}, // 5F
        
        // 60
        { name: 'RTS', operation: this.RTS, addressingMode: this.IMP}, // 60
        { name: 'ADC', operation: this.ADC, addressingMode: this.IZX}, // 61
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 62
        { name: 'RRA', operation: this.RRA, addressingMode: this.IZXRW}, // 63

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZP0}, // 64
        { name: 'ADC', operation: this.ADC, addressingMode: this.ZP0}, // 65
        { name: 'ROR', operation: this.ROR, addressingMode: this.ZP0RW}, // 66
        { name: 'RRA', operation: this.RRA, addressingMode: this.ZP0RW}, // 67

        { name: 'PLA', operation: this.PLA, addressingMode: this.IMP}, // 68
        { name: 'ADC', operation: this.ADC, addressingMode: this.IMM}, // 69
        { name: 'ROR', operation: this.ROR, addressingMode: this.IMP}, // 6A
        { name: 'ARR', operation: this.ARR, addressingMode: this.IMM}, // 6B

        { name: 'JMP', operation: this.JMP, addressingMode: this.IND}, // 6C
        { name: 'ADC', operation: this.ADC, addressingMode: this.ABS}, // 6D
        { name: 'ROR', operation: this.ROR, addressingMode: this.ABSRW}, // 6E
        { name: 'RRA', operation: this.RRA, addressingMode: this.ABSRW}, // 6F
        
        // 70
        { name: 'BVS', operation: this.BVS, addressingMode: this.REL}, // 70
        { name: 'ADC', operation: this.ADC, addressingMode: this.IZY}, // 71
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 72
        { name: 'RRA', operation: this.RRA, addressingMode: this.IZYRW}, // 73

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // 74
        { name: 'ADC', operation: this.ADC, addressingMode: this.ZPX}, // 75
        { name: 'ROR', operation: this.ROR, addressingMode: this.ZPXRW}, // 76
        { name: 'RRA', operation: this.RRA, addressingMode: this.ZPXRW}, // 77

        { name: 'SEI', operation: this.SEI, addressingMode: this.IMP}, // 78
        { name: 'ADC', operation: this.ADC, addressingMode: this.ABYR}, // 79
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // 7A
        { name: 'RRA', operation: this.RRA, addressingMode: this.ABYRW}, // 7B

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // 7C
        { name: 'ADC', operation: this.ADC, addressingMode: this.ABXR}, // 7D
        { name: 'ROR', operation: this.ROR, addressingMode: this.ABXRW}, // 7E
        { name: 'RRA', operation: this.RRA, addressingMode: this.ABXRW}, // 7F

        // 80
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMM}, // 80
        { name: 'STA', operation: this.STA, addressingMode: this.IZX}, // 81
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMM}, // 82
        { name: 'SAX', operation: this.SAX, addressingMode: this.IZX}, // 83

        { name: 'STY', operation: this.STY, addressingMode: this.ZP0}, // 84
        { name: 'STA', operation: this.STA, addressingMode: this.ZP0}, // 85
        { name: 'STX', operation: this.STX, addressingMode: this.ZP0}, // 86
        { name: 'SAX', operation: this.SAX, addressingMode: this.ZP0}, // 87

        { name: 'DEY', operation: this.DEY, addressingMode: this.IMP}, // 88
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMM}, // 89
        { name: 'TXA', operation: this.TXA, addressingMode: this.IMP}, // 8A
        { name: 'XAA', operation: this.XAA, addressingMode: this.IMM}, // 8B

        { name: 'STY', operation: this.STY, addressingMode: this.ABS}, // 8C
        { name: 'STA', operation: this.STA, addressingMode: this.ABS}, // 8D
        { name: 'STX', operation: this.STX, addressingMode: this.ABS}, // 8E
        { name: 'SAX', operation: this.SAX, addressingMode: this.ABS}, // 8F
        
        // 90
        { name: 'BCC', operation: this.BCC, addressingMode: this.REL}, // 90
        { name: 'STA', operation: this.STA, addressingMode: this.IZY}, // 91
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // 92
        { name: 'AHX', operation: this.AHX, addressingMode: this.IZY}, // 93

        { name: 'STY', operation: this.STY, addressingMode: this.ZPX}, // 94
        { name: 'STA', operation: this.STA, addressingMode: this.ZPX}, // 95
        { name: 'STX', operation: this.STX, addressingMode: this.ZPY}, // 96
        { name: 'SAX', operation: this.SAX, addressingMode: this.ZPY}, // 97

        { name: 'TYA', operation: this.TYA, addressingMode: this.IMP}, // 98
        { name: 'STA', operation: this.STA, addressingMode: this.ABYW}, // 99
        { name: 'TXS', operation: this.TXS, addressingMode: this.IMP}, // 9A
        { name: 'TAS', operation: this.TAS, addressingMode: this.ABYR}, // 9B

        { name: 'SHY', operation: this.SHY, addressingMode: this.ABXW}, // 9C
        { name: 'STA', operation: this.STA, addressingMode: this.ABXW}, // 9D
        { name: 'SHX', operation: this.SHX, addressingMode: this.ABYW}, // 9E
        { name: 'AHX', operation: this.AHX, addressingMode: this.ABYW}, // 9F

        // A0
        { name: 'LDY', operation: this.LDY, addressingMode: this.IMM}, // A0
        { name: 'LDA', operation: this.LDA, addressingMode: this.IZX}, // A1
        { name: 'LDX', operation: this.LDX, addressingMode: this.IMM}, // A2
        { name: 'LAX', operation: this.LAX, addressingMode: this.IZX}, // A3

        { name: 'LDY', operation: this.LDY, addressingMode: this.ZP0}, // A4
        { name: 'LDA', operation: this.LDA, addressingMode: this.ZP0}, // A5
        { name: 'LDX', operation: this.LDX, addressingMode: this.ZP0}, // A6
        { name: 'LAX', operation: this.LAX, addressingMode: this.ZP0}, // A7

        { name: 'TAY', operation: this.TAY, addressingMode: this.IMP}, // A8
        { name: 'LDA', operation: this.LDA, addressingMode: this.IMM}, // A9
        { name: 'TAX', operation: this.TAX, addressingMode: this.IMP}, // AA
        { name: 'LAX', operation: this.LAX, addressingMode: this.IMM}, // AB

        { name: 'LDY', operation: this.LDY, addressingMode: this.ABS}, // AC
        { name: 'LDA', operation: this.LDA, addressingMode: this.ABS}, // AD
        { name: 'LDX', operation: this.LDX, addressingMode: this.ABS}, // AE
        { name: 'LAX', operation: this.LAX, addressingMode: this.ABS}, // AF
        
        // B0
        { name: 'BCS', operation: this.BCS, addressingMode: this.REL}, // B0
        { name: 'LDA', operation: this.LDA, addressingMode: this.IZY}, // B1
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // B2
        { name: 'LAX', operation: this.LAX, addressingMode: this.IZY}, // B3

        { name: 'LDY', operation: this.LDY, addressingMode: this.ZPX}, // B4
        { name: 'LDA', operation: this.LDA, addressingMode: this.ZPX}, // B5
        { name: 'LDX', operation: this.LDX, addressingMode: this.ZPY}, // B6
        { name: 'LAX', operation: this.LAX, addressingMode: this.ZPY}, // B7

        { name: 'CLV', operation: this.CLV, addressingMode: this.IMP}, // B8
        { name: 'LDA', operation: this.LDA, addressingMode: this.ABYR}, // B9
        { name: 'TSX', operation: this.TSX, addressingMode: this.IMP}, // BA
        { name: 'LAS', operation: this.LAS, addressingMode: this.ABYR}, // BB

        { name: 'LDY', operation: this.LDY, addressingMode: this.ABXR}, // BC
        { name: 'LDA', operation: this.LDA, addressingMode: this.ABXR}, // BD
        { name: 'LDX', operation: this.LDX, addressingMode: this.ABYR}, // BE
        { name: 'LAX', operation: this.LAX, addressingMode: this.ABYR}, // BF

        // C0
        { name: 'CPY', operation: this.CPY, addressingMode: this.IMM}, // C0
        { name: 'CMP', operation: this.CMP, addressingMode: this.IZX}, // C1
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMM}, // C2
        { name: 'DCP', operation: this.DCP, addressingMode: this.IZXRW}, // C3

        { name: 'CPY', operation: this.CPY, addressingMode: this.ZP0}, // C4
        { name: 'CMP', operation: this.CMP, addressingMode: this.ZP0}, // C5
        { name: 'DEC', operation: this.DEC, addressingMode: this.ZP0RW}, // C6
        { name: 'DCP', operation: this.DCP, addressingMode: this.ZP0RW}, // C7

        { name: 'INY', operation: this.INY, addressingMode: this.IMP}, // C8
        { name: 'CMP', operation: this.CMP, addressingMode: this.IMM}, // C9
        { name: 'DEX', operation: this.DEX, addressingMode: this.IMP}, // CA
        { name: 'AXS', operation: this.AXS, addressingMode: this.IMM}, // CB

        { name: 'CPY', operation: this.CPY, addressingMode: this.ABS}, // CC
        { name: 'CMP', operation: this.CMP, addressingMode: this.ABS}, // CD
        { name: 'DEC', operation: this.DEC, addressingMode: this.ABSRW}, // CE
        { name: 'DCP', operation: this.DCP, addressingMode: this.ABSRW}, // CF
        
        // D0
        { name: 'BNE', operation: this.BNE, addressingMode: this.REL}, // D0
        { name: 'CMP', operation: this.CMP, addressingMode: this.IZY}, // D1
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // D2
        { name: 'DCP', operation: this.DCP, addressingMode: this.IZYRW}, // D3

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // D4
        { name: 'CMP', operation: this.CMP, addressingMode: this.ZPX}, // D5
        { name: 'DEC', operation: this.DEC, addressingMode: this.ZPXRW}, // D6
        { name: 'DCP', operation: this.DCP, addressingMode: this.ZPXRW}, // D7

        { name: 'CLD', operation: this.CLD, addressingMode: this.IMP}, // D8
        { name: 'CMP', operation: this.CMP, addressingMode: this.ABYR}, // D9
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // DA
        { name: 'DCP', operation: this.DCP, addressingMode: this.ABYRW}, // DB

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // DC
        { name: 'CMP', operation: this.CMP, addressingMode: this.ABXR}, // DD
        { name: 'DEC', operation: this.DEC, addressingMode: this.ABXRW}, // DE
        { name: 'DCP', operation: this.DCP, addressingMode: this.ABXRW}, // DF

        // E0
        { name: 'CPX', operation: this.CPX, addressingMode: this.IMM}, // E0
        { name: 'SBC', operation: this.SBC, addressingMode: this.IZX}, // E1
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMM}, // E2
        { name: 'ISB', operation: this.ISB, addressingMode: this.IZXRW}, // E3

        { name: 'CPX', operation: this.CPX, addressingMode: this.ZP0}, // E4
        { name: 'SBC', operation: this.SBC, addressingMode: this.ZP0}, // E5
        { name: 'INC', operation: this.INC, addressingMode: this.ZP0RW}, // E6
        { name: 'ISB', operation: this.ISB, addressingMode: this.ZP0RW}, // E7

        { name: 'INX', operation: this.INX, addressingMode: this.IMP}, // E8
        { name: 'SBC', operation: this.SBC, addressingMode: this.IMM}, // E9
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // EA
        { name: 'SBC', operation: this.SBC, addressingMode: this.IMM}, // EB

        { name: 'CPX', operation: this.CPX, addressingMode: this.ABS}, // EC
        { name: 'SBC', operation: this.SBC, addressingMode: this.ABS}, // ED
        { name: 'INC', operation: this.INC, addressingMode: this.ABSRW}, // EE
        { name: 'ISB', operation: this.ISB, addressingMode: this.ABSRW}, // EF
        
        // F0
        { name: 'BEQ', operation: this.BEQ, addressingMode: this.REL}, // F0
        { name: 'SBC', operation: this.SBC, addressingMode: this.IZY}, // F1
        { name: 'STP', operation: this.STP, addressingMode: this.IMP}, // F2
        { name: 'ISB', operation: this.ISB, addressingMode: this.IZYRW}, // F3

        { name: 'NOP', operation: this.NOP, addressingMode: this.ZPX}, // F4
        { name: 'SBC', operation: this.SBC, addressingMode: this.ZPX}, // F5
        { name: 'INC', operation: this.INC, addressingMode: this.ZPXRW}, // F6
        { name: 'ISB', operation: this.ISB, addressingMode: this.ZPXRW}, // F7

        { name: 'SED', operation: this.SED, addressingMode: this.IMP}, // F8
        { name: 'SBC', operation: this.SBC, addressingMode: this.ABYR}, // F9
        { name: 'NOP', operation: this.NOP, addressingMode: this.IMP}, // FA
        { name: 'ISB', operation: this.ISB, addressingMode: this.ABYRW}, // FB

        { name: 'NOP', operation: this.NOP, addressingMode: this.ABXR}, // FC
        { name: 'SBC', operation: this.SBC, addressingMode: this.ABXR}, // FD
        { name: 'INC', operation: this.INC, addressingMode: this.ABXRW}, // FE
        { name: 'ISB', operation: this.ISB, addressingMode: this.ABXRW}, // FF
    ];

    // Addressing Modes
    NUL() {} // Dummy Instruction/Adressing mode.
    IMP() { // Implied
        // Some operations state implied in the data sheet, but act on the accumulator.
        this.microCodeStack.push(() => {
            this._bus.data = this.a;
            this.pc++;
        });
    }
    IMM() { // Immediate            #v
        // fetch value
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
            this.pc++;
        });
    }
    ZP0() { // Zero Page            d
        // fetch address
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc)
        });
        // fetch value from address
        this.microCodeStack.push(() => {
            this._bus.read(this._bus.data & 0xff);
            this.pc++;
        });
    }
    ZP0RW() {
        this.ZP0();
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        })
    }
    private _ZPI(reg: number) { // Zero Page Indexed reg  d,reg     val = PEEK((arg + reg) % 256)
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        // TODO: check that this is how the 6502 behaves, previous supposition was that we could store the result
        // of this operation in the address bus.
        this.microCodeStack.push(() => {
            this.pc++;
            this._t = this._bus.data + reg;
        });
        this.microCodeStack.push(() => this._bus.read(this._t & 0xff));
    }
    private _ZPIRW(reg: number) {
        this._ZPI(reg);
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        })
    }
    ZPX() {
        this._ZPI(this.x);
    }
    ZPY() {
        this._ZPI(this.y);
    }
    ZPXRW() {
        this._ZPIRW(this.x);
    }
    ZPYRW() {
        this._ZPIRW(this.y);
    }
    ABS() { // Absolute             a
        // next two bytes, lo byte first.
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });

        // the operation can get the address with absread
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
            this.pc++;
        });
        this.microCodeStack.push(() => {
            this.absRead();
        });
    }
    ABSRW() {
        this.ABS();
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        })
    }
    REL() { // Relative             label
        // this is only used for branching.
        // we can only branch within the same page.
        // we will allow the branching instructions do the actual addressing
        // which is how it seems to be done in the actual hardware.
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
    }
    IND() { // Indirect              (a)
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
            this._bus.read((this._bus.data << 8) | this._t);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            // when fetching from an address at the edge of a page, the 6502 will fetch the hi byte from the beggining of the same page
            this._bus.read((this._bus.addr & 0xff00) | ((this._bus.addr + 1) & 0xff));
        });
        this.microCodeStack.push(() => {
            this.absRead();
        })
    }
    private _ABIR(reg: number) { // Absolute Indexed reg   a,reg     val = PEEK(arg + reg)
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(this.pc);
        });

        const op = this.fetch?.name || '';
        if (['STA', 'STX', 'STY', 'SHA', 'SHX', 'SHY'].includes(op)) {
            this.microCodeStack.push(() => {
                const lo = this._t + reg;
                const hi = this._bus.data << 8;
                this._bus.read(
                    hi + (lo & 0xff)
                );
                this.pc++;
                this.microCodeStack.unshift(() => {
                    this._bus.write(hi + lo, this._bus.data);
                });                
            });
            return;
        }
        this.microCodeStack.push(() => {
            const lo = this._t + reg;
            const hi = this._bus.data << 8;
            this._bus.read(
                hi + (lo & 0xff)
            );

            // on page change, add extra cycle to update the hi byte in the bus.
            if (lo > 0xff) {
                this.microCodeStack.unshift(() => this._bus.read(hi + lo));
            }
            this.pc++;
        });
    }
    private _ABIW(reg: number) { // Absolute Indexed reg   a,reg     val = PEEK(arg + reg)
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
            this._bus.read(
                hi + (lo & 0xff)
            );
            this.pc++;
            this.microCodeStack.unshift(() => {
                this._bus.write(hi + lo, this._bus.data);
            });                
        });
    }
    private _ABIRW(reg: number) { // Absolute Indexed reg   a,reg     val = PEEK(arg + reg)
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
            this._bus.read(
                hi + (lo & 0xff)
            );

            // on page change, add extra cycle to update the hi byte in the bus.
            this.microCodeStack.unshift(() => this._bus.read(hi + lo));
            this.pc++;
        });
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        })
    }
    ABXR() { // Absolute Indexed X   a,x     val = PEEK(arg + X)
        this._ABIR(this.x);

    }
    ABYR() { // Absolute Indexed Y   a,y     val = PEEK(arg + Y)
        this._ABIR(this.y);
    }
    ABXW() { // Absolute Indexed X   a,x     val = PEEK(arg + X)
        this._ABIW(this.x);

    }
    ABYW() { // Absolute Indexed Y   a,y     val = PEEK(arg + Y)
        this._ABIW(this.y);
    }
    ABXRW() { // Absolute Indexed X   a,x     val = PEEK(arg + X)
        this._ABIRW(this.x);

    }
    ABYRW() { // Absolute Indexed Y   a,y     val = PEEK(arg + Y)
        this._ABIRW(this.y);
    }
    IZX() { // Indirect Indexed X   (d,x)   val = PEEK(PEEK((arg + X) % 256) + PEEK((arg + X + 1) % 256) * 256)
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
        });
    }
    IZXRW() {
        this.IZX();
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        });
    }

    /**
     * Indirect indexed addressing

     Read instructions (LDA, EOR, AND, ORA, ADC, SBC, CMP)

        #    address   R/W description
       --- ----------- --- ------------------------------------------
        1      PC       R  fetch opcode, increment PC
        2      PC       R  fetch pointer address, increment PC
        3    pointer    R  fetch effective address low
        4   pointer+1   R  fetch effective address high,
                           add Y to low byte of effective address
        5   address+Y*  R  read from effective address,
                           fix high byte of effective address
        6+  address+Y   R  read from effective address

       Notes: The effective address is always fetched from zero page,
              i.e. the zero page boundary crossing is not handled.

              * The high byte of the effective address may be invalid
                at this time, i.e. it may be smaller by $100.

              + This cycle will be executed only if the effective address
                was invalid during cycle #5, i.e. page boundary was crossed.
     */
    IZY() { // Indirect Indexed Y   (d),y   val = PEEK(PEEK(arg) + PEEK((arg + 1) % 256) * 256 + Y)
        this.microCodeStack.push(() => { // Cycle 2 fetch pointer address, increment PC
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => { // Cycle 3 fetch effective address low
            this.pc++;
            this._bus.read(this._bus.data & 0xff);
        });
        this.microCodeStack.push(() => { // Cycle 4 fetch effective address high, add Y to low byte of effective address
            this._t = this._bus.data + this.y;
            this._bus.read((this._bus.addr + 1) & 0xff);
        });
        const op = this.fetch?.operation;
        if (op === this.STA || op === this.SAX) {
            this.microCodeStack.push(() => {
                const hi = this._bus.data << 8;
                const lo = this._t;
                this._bus.read(hi + lo);
            });
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, this._bus.data);
            });
            return;
        }
        this.microCodeStack.push(() => { // Cycle 5 read from effective address, fix high byte of effective address
            const hi = this._bus.data << 8;
            const lo = this._t;
            this._bus.read(hi | (lo & 0xff));
            if (lo > 0xff) {
                this.microCodeStack.unshift(() => { // Cycle 6
                    this._bus.read(hi  + lo);
                });
            }
        });
    }
    IZYW() {
        this.microCodeStack.push(() => { // Cycle 2 fetch pointer address, increment PC
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => { // Cycle 3 fetch effective address low
            this.pc++;
            this._bus.read(this._bus.data & 0xff);
        });
        this.microCodeStack.push(() => { // Cycle 4 fetch effective address high, add Y to low byte of effective address
            this._t = this._bus.data + this.y;
            this._bus.read((this._bus.addr + 1) & 0xff);
        });
        this.microCodeStack.push(() => {
            const hi = this._bus.data << 8;
            const lo = this._t;
            this._bus.read(hi + lo);
        });
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data);
        });
    }
    IZYRW() {
        this.microCodeStack.push(() => { // Cycle 2 fetch pointer address, increment PC
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => { // Cycle 3 fetch effective address low
            this.pc++;
            this._bus.read(this._bus.data & 0xff);
        });
        this.microCodeStack.push(() => { // Cycle 4 fetch effective address high, add Y to low byte of effective address
            this._t = this._bus.data + this.y;
            this._bus.read((this._bus.addr + 1) & 0xff);
        });
        this.microCodeStack.push(() => { // read from effective address fix high byte
            const hi = this._bus.data << 8;
            const lo = this._t;
            this._bus.read(hi + lo);
        });
        this.microCodeStack.push(() => { // read from effective address
            this._bus.read(this._bus.addr);
        });
        this.microCodeStack.push(() => { // write value back to effective address 
            this._bus.write(this._bus.addr, this._bus.data);
        });
    }
    

    // Operations
    ADC() { // Add with Carry
        this.microCodeStack.push(() => {
            const m = this.a;
            const n = this._bus.data;
            const result = m + n + this.getFlag(Flags.C);
            this.a = result & 0xff;

            this.setFlag(Flags.C, result & 0x100);
            // formula taken from http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
            this.setFlag(Flags.V, (m ^ result) & (n ^result) & 0x80);

            this.testNZFlags(result);
        })
    }
    SBC() { // Substract with carry
        // substraction works the same as addition with flipped bits on the second argument
        this.microCodeStack.push(() => {
            const m = this.a;
            const n = ~this._bus.data;
            const result = m + n + this.getFlag(Flags.C);
            this.a = result & 0xff;

            this.setFlag(Flags.C, ~result & 0x100);
            // formula taken from http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
            this.setFlag(Flags.V, (m ^ result) & (n ^ result) & 0x80);

            this.testNZFlags(result);
        })
    }
    AND() { // Bitwise AND with Acc
        this.microCodeStack.push(() => {
            this.a &= this._bus.data;

            this.testNZFlags(this.a);
        });
    }
    ASL() { // Arithmetic shift(1) left
        let result = 0;
        const p = this;
        function setFlags (result: number) {
            p.setFlag(Flags.N, result & 0x80); // test bit 7
            p.setFlag(Flags.Z, !(result & 0xff));
            p.setFlag(Flags.C, result & 0x100); // test bit 8
        }
        if (this.fetch?.addressingMode === this.IMP) {
            this.microCodeStack.push(() => {
                result = this.a << 1;
                this.a = result & 0xff;
                setFlags(result);
            });
        } else {
            this.microCodeStack.push(() => {
                result = this._bus.data << 1;
                this._bus.write(this._bus.addr, result & 0xff);
                setFlags(result);
            });
            this.NOP(); // allow the result to be saved before fetching the next instruction.
        }
    }
    LSR() { // Logical shift right
        if (this.fetch?.addressingMode === this.IMP) {
            this.microCodeStack.push(() => {
                this.setFlag(Flags.C, this.a & 0x1);
                this.a = this.a >> 1;
                this.testNZFlags(this.a);
            });
        } else {
            this.microCodeStack.push(() => {
                const result = this._bus.data >> 1;
                this.setFlag(Flags.C, this._bus.data & 0x1);
                this.testNZFlags(result);
                this._bus.write(this._bus.addr, result);   
            });
            this.NOP();
        }
    }
    BIT() { // test bits
        this.microCodeStack.push(() => {
            this.setFlag(Flags.N, this._bus.data & 0x80); // test bit 7
            this.setFlag(Flags.Z, !(this._bus.data & this.a));
            this.setFlag(Flags.V, this._bus.data & 0x40); // test bit 6
        });
    }
    private _BRA(shouldBranch: boolean) { // Generic branch
        this.microCodeStack.push(() => {
            this.pc++;
            if (shouldBranch) {
                const hi = this.pc & 0xff00;
                const lo = (this.pc & 0xff) + this._bus.data;

                // +1 cycle if branch crosses page boundary
                if (lo > 0xff && !(lo & 0xff)) {
                    this.microCodeStack.unshift(() => this.pc = hi + lo);
                }
                // +1 cycle if branch taken
                this.microCodeStack.unshift(() => this.pc = hi | (lo & 0xff));
            }
        })
    }
    BPL() { // Branch on plus (N = 0)
        this._BRA(this.getFlag(Flags.N) === 0);
    }
    BMI() { // Branch on minus (N = 1)
        this._BRA(this.getFlag(Flags.N) === 1);
    }
    BVC() { // Branch on overfow clear (V = 0)
        this.microCodeStack.push(() => {
            this.pc++;
            if (this.getFlag(Flags.V) === 0) {
                const hi = this.pc & 0xff00;
                const lo = (this.pc & 0xff) + this._bus.data;
                this.microCodeStack.push(() => this.pc = hi + lo);
                // BVC always takes 3 cycles if branch is taken.
            }
        });
    }
    BVS() { // Branch on overflow set (V = 1)
        this._BRA(this.getFlag(Flags.V) === 1);
    }
    BCC() { // Branch on carry clear (C = 0)
        this._BRA(this.getFlag(Flags.C) === 0);
    }
    BCS() { // Branch on carry set (C = 1)
        this._BRA(this.getFlag(Flags.C) === 1);
    }
    BNE() { // Branch on not equal (Z = 0)
        this._BRA(this.getFlag(Flags.Z) === 0);
    }
    BEQ() { // Branch on equal (Z = 1)
        this._BRA(this.getFlag(Flags.Z) === 1);
    }
    BRK() { // BreaK
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
            this.pushStack(this.pc >> 8);
        });
        this.microCodeStack.push(() => {
            this.pushStack(this.pc & 0xff);
        });
        this.microCodeStack.push(() => {
            this.pushStack(this.status);
            this.setFlag(Flags.B, 1);
        });
        this.microCodeStack.push(() => {
            this._bus.read(0xfffe);
        });
        this.microCodeStack.push(() => {
            this.pc = this._bus.data
            this._bus.read(0xffff);
        });
        this.microCodeStack.push(() => {
            this.pc |= this._bus.data << 8;
        });
        throw new Error('Break!');
    }
    private _CPA(reg: number) { // generic compare
        this.microCodeStack.push(() => {
            const m = reg;
            const n = this._bus.data ^ 0xff;
            const result = m + n + 1;
            this.setFlag(Flags.C, result & 0x100);
            this.testNZFlags(result);
        });
    }
    CMP() { // compare A
        this._CPA(this.a);
    }
    CPX() { // compare X
        this._CPA(this.x);
    }
    CPY() { // compare Y
        this._CPA(this.y);
    }
    DEC() { // decrement memory
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data - 1);
            this.testNZFlags(this._bus.data);
        });
        this.NOP();
    }
    INC() { // Increment memory
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data + 1);
            this.testNZFlags(this._bus.data);
        });
        this.NOP();
    }
    EOR() { // exclusive or
        this.microCodeStack.push(() => {
            this.a ^= this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    CLC() { // clear carry
        this.microCodeStack.push(() => this.setFlag(Flags.C, 0));
    }
    SEC() { // set carry
        this.microCodeStack.push(() => this.setFlag(Flags.C, 1));
    }
    CLI() { // clear Interrupt
        this.microCodeStack.push(() => this.setFlag(Flags.I, 0));
    }
    SEI() { // set interrupt
        this.microCodeStack.push(() => this.setFlag(Flags.I, 1));
    }
    CLV() { // clear overflow
        this.microCodeStack.push(() => this.setFlag(Flags.V, 0));
    }
    CLD() { // clear decimal
        this.microCodeStack.push(() => this.setFlag(Flags.D, 0));
    }
    SED() { // set decimal
        this.microCodeStack.push(() => this.setFlag(Flags.D, 1));
    }
    JMP() { // Jump
        const p = this._getPreviousMicroCode();
        this.microCodeStack.push(() => {
            p();
            this.pc = this._bus.addr;
        });
    }
    JSR() { // Jump to subroutine
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
        this.microCodeStack.push(() => { // cycle 2 
            this.pc++;
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => { // cycle 3
            this._t = this._bus.data;
            this.pc++;
            this._bus.read(0x100 | this.stackPointer);
        });
        this.microCodeStack.push(() => {
            this.pushStack(this.pc >> 8);
        })
        this.microCodeStack.push(() => { // cycle 4
            this.pushStack((this.pc) & 0xff);
        });
        this.microCodeStack.push(() => { // cycle 5
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => { // cycle 6
            this.pc = (this._bus.data << 8) | (this._t & 0xff);
        });
    }
    LDA() { // Load A
        this.microCodeStack.push(() => {
            this.a = this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    LDX() { // Load X
        this.microCodeStack.push(() => {
            this.x = this._bus.data;
            this.testNZFlags(this.x);
        });
    }
    LDY() { // Load Y
        this.microCodeStack.push(() => {
            this.y = this._bus.data;
            this.testNZFlags(this.y);
        });
    }
    NOP() { // no operation
        this.microCodeStack.push(() => {});
    }
    ORA() { // Bitwise OR with accumulator
        this.microCodeStack.push(() => {
            this.a |= this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    TAX() { // Transfer A to X
        this.microCodeStack.push(() => {
            this.x = this.a;
            this.testNZFlags(this.x);
        });
    }
    TXA() { // Transfer X to A
        this.microCodeStack.push(() => {
            this.a = this.x;
            this.testNZFlags(this.a);
        })
    }
    DEX() { // Decrement X
        this.microCodeStack.push(() => {
            this.x--;
            this.testNZFlags(this.x);
        });
    }
    DEY() { // Decrement Y
        this.microCodeStack.push(() => {
            this.y--;
            this.testNZFlags(this.y);
        });
    }
    INX() { // Increment X
        this.microCodeStack.push(() => {
            this.x++;
            this.testNZFlags(this.x);
        });
    }
    INY() { // Increment Y
        this.microCodeStack.push(() => {
            this.y++;
            this.testNZFlags(this.y);
        });
    }
    TAY() { // Transfer A to Y
        this.microCodeStack.push(() => {
            this.y = this.a;
            this.testNZFlags(this.y);
        });
    }
    TYA() { // Transfer Y to A
        this.microCodeStack.push(() => {
            this.a = this.y;
            this.testNZFlags(this.a);
        });
    }
    ROL() { // Rotate Left
        const p = this;
        function rotate(v: number): number {
            let result = v << 1;

            // set b0 to the value of the carry flag
            if (p.getFlag(Flags.C)) {
                result |= 0x1;
            } else {
                result &= ~0x1;
            }

            // set the carry flag to the value of b7
            p.setFlag(Flags.C, v & 0x80);
            p.testNZFlags(result);
            return result;
        }
        if (this.fetch?.addressingMode === this.IMP) {
            this.microCodeStack.push(() => {
                this.a = rotate(this.a) & 0xff;
            });    
        } else {
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, rotate(this._bus.data) & 0xff);
            });
            this.NOP();
        }
    }
    ROR() { // Rotate right
        const p = this;
        function rotate(v: number): number {
            let result = v >> 1;

            // set b7 to the value of the carry flag.
            if (p.getFlag(Flags.C)) {
                result |= 0x80;
            } else {
                result &= ~0x80;
            }

            // set the carry flag to the value of b0
            p.setFlag(Flags.C, v & 0x1);
            p.testNZFlags(result);
            return result;
        }
        if (this.fetch?.addressingMode === this.IMP) {
            this.microCodeStack.push(() => {
                this.a = rotate(this.a) & 0xff;
            });    
        } else {
            this.microCodeStack.push(() => {
                this._bus.write(this._bus.addr, rotate(this._bus.data) & 0xff);
            });
            this.NOP();
        }
    }
    RTI() { // Return from Interrupt
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        })
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
    RTS() { // Return from SubRoutine
        this.microCodeStack.push(() => {
            this.pc++;
            this._bus.read(this.pc);
        })
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
    private _STO(v: number) { // Generic store value to current addr
        const p = this._getPreviousMicroCode();
        this.microCodeStack.push(() => {
            p();
            this._bus.write(this._bus.addr, v);
        });
        this.NOP();
    }
    STA() { // Store A
        this._STO(this.a);
    }
    STX() { // Store X
        this._STO(this.x);
    }
    STY() {
        this._STO(this.y);
    }
    TXS() { // Transfer X to stack pointer
        this.microCodeStack.push(() => {
            this.stackPointer = this.x;
        });
    }
    TSX() { // Transfer Stack Pointer to X 
        this.microCodeStack.push(() => {
            this.x = this.stackPointer;
            this.testNZFlags(this.x);
        });
    }
    PHA() { // Push Accumulator
        this.microCodeStack.push(() => {
            this.pushStack(this.a);
        });
        this.NOP();
    }
    PLA() { // Pull Accumulator
        this.microCodeStack.push(() => {
            this._bus.read(this.pc);
        });
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.a = this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    PHP() { // Push Processor Status
        this.microCodeStack.push(() => {

            this.pushStack(this.status | Flags.B);
        });
        this.NOP();
    }
    PLP() { // Pull Processor Status
        this.microCodeStack.push(() => {
            this._bus.read(this.pc);
        })
        this.microCodeStack.push(() => {
            this.popStack();
        });
        this.microCodeStack.push(() => {
            this.status = this._bus.data;
            this.setFlag(Flags.B, 0);
        });
    }

    // Illegal opcodes.
    // Many of these should have bad cycle counts. Fix as needed.
    SLO() {
        this.ASL();
        // Addressing mode is never implied, so we can safely pop the last microcode because we know it to be a nop
        this.microCodeStack.pop();
        this.ORA();
    }
    RLA() {
        this.ROL();
        // Addressing mode is never implied, so we can safely pop the last microcode because we know it to be a nop
        this.microCodeStack.pop();
        this.AND();
    }
    SRE() {
        this.LSR();
        // Addressing mode is never implied, so we can safely pop the last microcode because we know it to be a nop
        this.microCodeStack.pop();
        this.EOR();
    }
    RRA() {
        this.ROR();
        // Addressing mode is never implied, so we can safely pop the last microcode because we know it to be a nop
        this.microCodeStack.pop();
        this.ADC();
    }
    SAX() {
        this._STO(this.a & this.x);
    }
    LAX() {
        this.microCodeStack.push(() => {
            // LDA LDX
            this.x = this.a = this._bus.data;
            this.testNZFlags(this.a);
        });
    }
    DCP() {
        this.microCodeStack.push(() => {
            // DEC
            this._bus.write(this._bus.addr, this._bus.data - 1);

            // CMP
            const m = this.a;
            const n = this._bus.data ^ 0xff;
            const result = m + n + 1;
            this.setFlag(Flags.C, result & 0x100);
            this.testNZFlags(result);
        });
        this.NOP();
    }
    ISB() { // Aka ISC
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this._bus.data + 1);
            this.testNZFlags(this._bus.data);
        });
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
        })
    }
    AXS() {
        this.CMP();
        this.DEX();
    }
    AHX() {
        this.microCodeStack.push(() => {
            this._bus.write(this._bus.addr, this.a & this.x & (this._bus.addr >> 8));
        });
        this.NOP()
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
    STP() { // KIL processor should get stuck in an infinite loop trying to process this code.
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

    public clock(): void {
        // make a micro code stack
        // running the addressing mode and the operation should
        // add steps to the stack
        // if stack is empty, current data should be an op
        // each item in the stack is 1 cycle
        this.cycle++;
        if (this.microCodeStack.length) {
            const microCode = this.microCodeStack.shift();
            // we check for falsy, although this should never happen.
            microCode && microCode();

            // after every op is done, fetch next instruction.
            if (!this.microCodeStack.length) {
                this._bus.read(this.pc);
            }
        } else {
            this.fetch = this.opCodeLookup[this._bus.data];
            this.count++;
            this.broadcast('fetch');
            this.fetch.addressingMode.call(this);
            this.fetch.operation.call(this);

            const microCode = this.microCodeStack.shift();
            // we check for falsy, although this should never happen.
            microCode && microCode();
        }
    }
    public count = 0;
    public getFlag(flag: Flags): number {
        return (this.status & flag) != 0 ? 1 : 0;
    }
    public setFlag(flag: Flags, value: number | boolean) {
        if (value) {
            this.status |= flag; // set bit
        } else {
            this.status &= ~flag; // clear bit
        }
    }
    public pushStack(value: number) {
        this._bus.write(0x100 | this.stackPointer, value);
        this.stackPointer--;
    }
    public popStack() {
        this.stackPointer++;
        this._bus.read(0x100 | this.stackPointer);
    }
    public testNZFlags(v: number) {
        this.setFlag(Flags.N, v & 0x80);
        this.setFlag(Flags.Z, !(v & 0xff));
    }
    public absRead() {
        this._bus.read((this._bus.data << 8) | this._t);
    }
    public absWrite(v: number) {
        this._bus.write((this._bus.data << 8) | this._t, v);
    }
}