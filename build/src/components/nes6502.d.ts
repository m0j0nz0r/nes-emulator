import { Bus } from './bus';
declare enum Flags {
    C = 1,
    Z = 2,
    I = 4,
    D = 8,
    B = 16,
    U = 32,
    V = 64,
    N = 128
}
interface Instruction {
    name: string;
    operation: () => void;
    addressingMode: () => void;
}
export declare class nes6502 {
    constructor(bus: Bus);
    private _bus;
    private _t;
    private _fetch?;
    clockSpeed: number;
    private _a;
    get a(): number;
    set a(v: number);
    private _x;
    get x(): number;
    set x(v: number);
    private _y;
    get y(): number;
    set y(v: number);
    stackPointer: number;
    pc: number;
    status: number;
    microCodeStack: Function[];
    opCodeLookup: Instruction[];
    NUL(): void;
    IMP(): void;
    ACC(): void;
    IMM(): void;
    ZP0(): void;
    private _ZPI;
    ZPX(): void;
    ZPY(): void;
    ABS(): void;
    REL(): void;
    IND(): void;
    private _ABI;
    ABX(): void;
    ABY(): void;
    IZX(): void;
    IZY(): void;
    ADC(): void;
    SBC(): void;
    AND(): void;
    ASL(): void;
    LSR(): void;
    BIT(): void;
    private _BRA;
    BPL(): void;
    BMI(): void;
    BVC(): void;
    BVS(): void;
    BCC(): void;
    BCS(): void;
    BNE(): void;
    BEQ(): void;
    BRK(): void;
    private _CPA;
    CMP(): void;
    CPX(): void;
    CPY(): void;
    DEC(): void;
    INC(): void;
    EOR(): void;
    CLC(): void;
    SEC(): void;
    CLI(): void;
    SEI(): void;
    CLV(): void;
    CLD(): void;
    SED(): void;
    JMP(): void;
    JSR(): void;
    LDA(): void;
    LDX(): void;
    LDY(): void;
    NOP(): void;
    ORA(): void;
    TAX(): void;
    TXA(): void;
    DEX(): void;
    DEY(): void;
    INX(): void;
    INY(): void;
    TAY(): void;
    TYA(): void;
    ROL(): void;
    ROR(): void;
    RTI(): void;
    RTS(): void;
    private _STO;
    STA(): void;
    STX(): void;
    STY(): void;
    TXS(): void;
    TSX(): void;
    PHA(): void;
    PLA(): void;
    PHP(): void;
    PLP(): void;
    SLO(): void;
    RLA(): void;
    SRE(): void;
    RRA(): void;
    SAX(): void;
    LAX(): void;
    DCP(): void;
    ISC(): void;
    ANC(): void;
    ALR(): void;
    ARR(): void;
    XAA(): void;
    AXS(): void;
    AHX(): void;
    SHY(): void;
    SHX(): void;
    TAS(): void;
    LAS(): void;
    STP(): void;
    reset(): void;
    irq(): void;
    nmi(): void;
    clock(): void;
    private count;
    getFlag(flag: Flags): number;
    setFlag(flag: Flags, value: number | boolean): void;
    pushStack(value: number): void;
    popStack(): void;
    testNZFlags(v: number): void;
}
export {};
