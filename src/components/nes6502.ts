import { Bus } from './bus';
import { EventHandler, Logger } from './eventHandler';
import { Nes6502AddressingModes } from './nes6502AddressingModes'; // Import the new AddressingModes class

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

export class Nes6502 extends EventHandler {
  constructor(bus: Bus, logger?: Logger) {
    super(logger);
    this.bus = bus;
    this.addressingModes = new Nes6502AddressingModes(this);
    this.opCodeLookup = [
      // 00
      { name: 'BRK', operation: this.BRK, addressingMode: this.addressingModes.IMP },   // 00
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.IZX },   // 01
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 02
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.IZXRW }, // 03

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZP0 },   // 04
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.ZP0 },   // 05
      { name: 'ASL', operation: this.ASL, addressingMode: this.addressingModes.ZP0RW }, // 06
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.ZP0RW }, // 07

      { name: 'PHP', operation: this.PHP, addressingMode: this.addressingModes.IMP },   // 08
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.IMM },   // 09
      { name: 'ASL', operation: this.ASL, addressingMode: this.addressingModes.IMP },   // 0A
      { name: 'ANC', operation: this.ANC, addressingMode: this.addressingModes.IMM },   // 0B

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABS },   // 0C
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.ABS },   // 0D
      { name: 'ASL', operation: this.ASL, addressingMode: this.addressingModes.ABSRW }, // 0E
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.ABSRW }, // 0F

      // 10
      { name: 'BPL', operation: this.BPL, addressingMode: this.addressingModes.REL },   // 10
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.IZY },   // 11
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 12
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.IZYRW }, // 13

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // 14
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.ZPX },   // 15
      { name: 'ASL', operation: this.ASL, addressingMode: this.addressingModes.ZPXRW }, // 16
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.ZPXRW }, // 17

      { name: 'CLC', operation: this.CLC, addressingMode: this.addressingModes.IMP },   // 18
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.ABYR },  // 19
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // 1A
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.ABYRW }, // 1B

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // 1C
      { name: 'ORA', operation: this.ORA, addressingMode: this.addressingModes.ABXR },  // 1D
      { name: 'ASL', operation: this.ASL, addressingMode: this.addressingModes.ABXRW }, // 1E
      { name: 'SLO', operation: this.SLO, addressingMode: this.addressingModes.ABXRW }, // 1F

      // 20
      { name: 'JSR', operation: this.JSR, addressingMode: this.addressingModes.NUL },   // 20. JSR will do its own adressing.
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.IZX },   // 21
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 22
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.IZXRW }, // 23

      { name: 'BIT', operation: this.BIT, addressingMode: this.addressingModes.ZP0 },   // 24
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.ZP0 },   // 25
      { name: 'ROL', operation: this.ROL, addressingMode: this.addressingModes.ZP0RW }, // 26
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.ZP0RW }, // 27

      { name: 'PLP', operation: this.PLP, addressingMode: this.addressingModes.IMP },   // 28
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.IMM },   // 29
      { name: 'ROL', operation: this.ROL, addressingMode: this.addressingModes.IMP },   // 2A
      { name: 'ANC', operation: this.ANC, addressingMode: this.addressingModes.IMM },   // 2B

      { name: 'BIT', operation: this.BIT, addressingMode: this.addressingModes.ABS },   // 2C
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.ABS },   // 2D
      { name: 'ROL', operation: this.ROL, addressingMode: this.addressingModes.ABSRW }, // 2E
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.ABSRW }, // 2F

      // 30
      { name: 'BMI', operation: this.BMI, addressingMode: this.addressingModes.REL },   // 30
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.IZY },   // 31
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 32
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.IZYRW }, // 33

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // 34
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.ZPX },   // 35
      { name: 'ROL', operation: this.ROL, addressingMode: this.addressingModes.ZPXRW }, // 36
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.ZPXRW }, // 37

      { name: 'SEC', operation: this.SEC, addressingMode: this.addressingModes.IMP },   // 38
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.ABYR },  // 39
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // 3A
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.ABYRW }, // 3B

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // 3C
      { name: 'AND', operation: this.AND, addressingMode: this.addressingModes.ABXR },  // 3D
      { name: 'ROL', operation: this.ROL, addressingMode: this.addressingModes.ABXRW }, // 3E
      { name: 'RLA', operation: this.RLA, addressingMode: this.addressingModes.ABXRW }, // 3F

      // 40
      { name: 'RTI', operation: this.RTI, addressingMode: this.addressingModes.IMM },   // 40
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.IZX },   // 41
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 42
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.IZXRW }, // 43

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZP0 },   // 44
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.ZP0 },   // 45
      { name: 'LSR', operation: this.LSR, addressingMode: this.addressingModes.ZP0RW }, // 46
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.ZP0RW }, // 47

      { name: 'PHA', operation: this.PHA, addressingMode: this.addressingModes.IMP },   // 48
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.IMM },   // 49
      { name: 'LSR', operation: this.LSR, addressingMode: this.addressingModes.IMP },   // 4A
      { name: 'ALR', operation: this.ALR, addressingMode: this.addressingModes.IMM },   // 4B

      { name: 'JMP', operation: this.JMP, addressingMode: this.addressingModes.ABS },   // 4C
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.ABS },   // 4D
      { name: 'LSR', operation: this.LSR, addressingMode: this.addressingModes.ABSRW }, // 4E
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.ABSRW }, // 4F

      // 50
      { name: 'BVC', operation: this.BVC, addressingMode: this.addressingModes.REL },   // 50
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.IZY },   // 51
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 52
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.IZYRW }, // 53

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // 54
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.ZPX },   // 55
      { name: 'LSR', operation: this.LSR, addressingMode: this.addressingModes.ZPXRW }, // 56
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.ZPXRW }, // 57

      { name: 'CLI', operation: this.CLI, addressingMode: this.addressingModes.IMP },   // 58
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.ABYR },  // 59
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // 5A
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.ABYRW }, // 5B

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // 5C
      { name: 'EOR', operation: this.EOR, addressingMode: this.addressingModes.ABXR },  // 5D
      { name: 'LSR', operation: this.LSR, addressingMode: this.addressingModes.ABXRW }, // 5E
      { name: 'SRE', operation: this.SRE, addressingMode: this.addressingModes.ABXRW }, // 5F

      // 60
      { name: 'RTS', operation: this.RTS, addressingMode: this.addressingModes.IMP },   // 60
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.IZX },   // 61
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 62
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.IZXRW }, // 63

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZP0 },   // 64
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.ZP0 },   // 65
      { name: 'ROR', operation: this.ROR, addressingMode: this.addressingModes.ZP0RW }, // 66
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.ZP0RW }, // 67

      { name: 'PLA', operation: this.PLA, addressingMode: this.addressingModes.IMP },   // 68
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.IMM },   // 69
      { name: 'ROR', operation: this.ROR, addressingMode: this.addressingModes.IMP },   // 6A
      { name: 'ARR', operation: this.ARR, addressingMode: this.addressingModes.IMM },   // 6B

      { name: 'JMP', operation: this.JMP, addressingMode: this.addressingModes.IND },   // 6C
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.ABS },   // 6D
      { name: 'ROR', operation: this.ROR, addressingMode: this.addressingModes.ABSRW }, // 6E
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.ABSRW }, // 6F

      // 70
      { name: 'BVS', operation: this.BVS, addressingMode: this.addressingModes.REL },   // 70
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.IZY },   // 71
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 72
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.IZYRW }, // 73

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // 74
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.ZPX },   // 75
      { name: 'ROR', operation: this.ROR, addressingMode: this.addressingModes.ZPXRW }, // 76
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.ZPXRW }, // 77

      { name: 'SEI', operation: this.SEI, addressingMode: this.addressingModes.IMP },   // 78
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.ABYR },  // 79
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // 7A
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.ABYRW }, // 7B

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // 7C
      { name: 'ADC', operation: this.ADC, addressingMode: this.addressingModes.ABXR },  // 7D
      { name: 'ROR', operation: this.ROR, addressingMode: this.addressingModes.ABXRW }, // 7E
      { name: 'RRA', operation: this.RRA, addressingMode: this.addressingModes.ABXRW }, // 7F

      // 80
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMM },   // 80
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.IZX },   // 81
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMM },   // 82
      { name: 'SAX', operation: this.SAX, addressingMode: this.addressingModes.IZX },   // 83

      { name: 'STY', operation: this.STY, addressingMode: this.addressingModes.ZP0 },   // 84
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.ZP0 },   // 85
      { name: 'STX', operation: this.STX, addressingMode: this.addressingModes.ZP0 },   // 86
      { name: 'SAX', operation: this.SAX, addressingMode: this.addressingModes.ZP0 },   // 87

      { name: 'DEY', operation: this.DEY, addressingMode: this.addressingModes.IMP },   // 88
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMM },   // 89
      { name: 'TXA', operation: this.TXA, addressingMode: this.addressingModes.IMP },   // 8A
      { name: 'XAA', operation: this.XAA, addressingMode: this.addressingModes.IMM },   // 8B

      { name: 'STY', operation: this.STY, addressingMode: this.addressingModes.ABS },   // 8C
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.ABS },   // 8D
      { name: 'STX', operation: this.STX, addressingMode: this.addressingModes.ABS },   // 8E
      { name: 'SAX', operation: this.SAX, addressingMode: this.addressingModes.ABS },   // 8F

      // 90
      { name: 'BCC', operation: this.BCC, addressingMode: this.addressingModes.REL },   // 90
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.IZY },   // 91
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // 92
      { name: 'AHX', operation: this.AHX, addressingMode: this.addressingModes.IZY },   // 93

      { name: 'STY', operation: this.STY, addressingMode: this.addressingModes.ZPX },   // 94
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.ZPX },   // 95
      { name: 'STX', operation: this.STX, addressingMode: this.addressingModes.ZPY },   // 96
      { name: 'SAX', operation: this.SAX, addressingMode: this.addressingModes.ZPY },   // 97

      { name: 'TYA', operation: this.TYA, addressingMode: this.addressingModes.IMP },   // 98
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.ABYW },  // 99
      { name: 'TXS', operation: this.TXS, addressingMode: this.addressingModes.IMP },   // 9A
      { name: 'TAS', operation: this.TAS, addressingMode: this.addressingModes.ABYR },  // 9B

      { name: 'SHY', operation: this.SHY, addressingMode: this.addressingModes.ABXW },  // 9C
      { name: 'STA', operation: this.STA, addressingMode: this.addressingModes.ABXW },  // 9D
      { name: 'SHX', operation: this.SHX, addressingMode: this.addressingModes.ABYW },  // 9E
      { name: 'AHX', operation: this.AHX, addressingMode: this.addressingModes.ABYW },  // 9F

      // A0
      { name: 'LDY', operation: this.LDY, addressingMode: this.addressingModes.IMM },   // A0
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.IZX },   // A1
      { name: 'LDX', operation: this.LDX, addressingMode: this.addressingModes.IMM },   // A2
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.IZX },   // A3

      { name: 'LDY', operation: this.LDY, addressingMode: this.addressingModes.ZP0 },   // A4
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.ZP0 },   // A5
      { name: 'LDX', operation: this.LDX, addressingMode: this.addressingModes.ZP0 },   // A6
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.ZP0 },   // A7

      { name: 'TAY', operation: this.TAY, addressingMode: this.addressingModes.IMP },   // A8
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.IMM },   // A9
      { name: 'TAX', operation: this.TAX, addressingMode: this.addressingModes.IMP },   // AA
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.IMM },   // AB

      { name: 'LDY', operation: this.LDY, addressingMode: this.addressingModes.ABS },   // AC
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.ABS },   // AD
      { name: 'LDX', operation: this.LDX, addressingMode: this.addressingModes.ABS },   // AE
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.ABS },   // AF

      // B0
      { name: 'BCS', operation: this.BCS, addressingMode: this.addressingModes.REL },   // B0
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.IZY },   // B1
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // B2
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.IZY },   // B3

      { name: 'LDY', operation: this.LDY, addressingMode: this.addressingModes.ZPX },   // B4
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.ZPX },   // B5
      { name: 'LDX', operation: this.LDX, addressingMode: this.addressingModes.ZPY },   // B6
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.ZPY },   // B7

      { name: 'CLV', operation: this.CLV, addressingMode: this.addressingModes.IMP },   // B8
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.ABYR },  // B9
      { name: 'TSX', operation: this.TSX, addressingMode: this.addressingModes.IMP },   // BA
      { name: 'LAS', operation: this.LAS, addressingMode: this.addressingModes.ABYR },  // BB

      { name: 'LDY', operation: this.LDY, addressingMode: this.addressingModes.ABXR },  // BC
      { name: 'LDA', operation: this.LDA, addressingMode: this.addressingModes.ABXR },  // BD
      { name: 'LDX', operation: this.LDX, addressingMode: this.addressingModes.ABYR },  // BE
      { name: 'LAX', operation: this.LAX, addressingMode: this.addressingModes.ABYR },  // BF

      // C0
      { name: 'CPY', operation: this.CPY, addressingMode: this.addressingModes.IMM },   // C0
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.IZX },   // C1
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMM },   // C2
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.IZXRW }, // C3

      { name: 'CPY', operation: this.CPY, addressingMode: this.addressingModes.ZP0 },   // C4
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.ZP0 },   // C5
      { name: 'DEC', operation: this.DEC, addressingMode: this.addressingModes.ZP0RW }, // C6
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.ZP0RW }, // C7

      { name: 'INY', operation: this.INY, addressingMode: this.addressingModes.IMP },   // C8
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.IMM },   // C9
      { name: 'DEX', operation: this.DEX, addressingMode: this.addressingModes.IMP },   // CA
      { name: 'AXS', operation: this.AXS, addressingMode: this.addressingModes.IMM },   // CB

      { name: 'CPY', operation: this.CPY, addressingMode: this.addressingModes.ABS },   // CC
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.ABS },   // CD
      { name: 'DEC', operation: this.DEC, addressingMode: this.addressingModes.ABSRW }, // CE
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.ABSRW }, // CF

      // D0
      { name: 'BNE', operation: this.BNE, addressingMode: this.addressingModes.REL },   // D0
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.IZY },   // D1
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // D2
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.IZYRW }, // D3

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // D4
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.ZPX },   // D5
      { name: 'DEC', operation: this.DEC, addressingMode: this.addressingModes.ZPXRW }, // D6
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.ZPXRW }, // D7

      { name: 'CLD', operation: this.CLD, addressingMode: this.addressingModes.IMP },   // D8
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.ABYR },  // D9
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // DA
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.ABYRW }, // DB

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // DC
      { name: 'CMP', operation: this.CMP, addressingMode: this.addressingModes.ABXR },  // DD
      { name: 'DEC', operation: this.DEC, addressingMode: this.addressingModes.ABXRW }, // DE
      { name: 'DCP', operation: this.DCP, addressingMode: this.addressingModes.ABXRW }, // DF

      // E0
      { name: 'CPX', operation: this.CPX, addressingMode: this.addressingModes.IMM },   // E0
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.IZX },   // E1
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMM },   // E2
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.IZXRW }, // E3

      { name: 'CPX', operation: this.CPX, addressingMode: this.addressingModes.ZP0 },   // E4
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.ZP0 },   // E5
      { name: 'INC', operation: this.INC, addressingMode: this.addressingModes.ZP0RW }, // E6
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.ZP0RW }, // E7

      { name: 'INX', operation: this.INX, addressingMode: this.addressingModes.IMP },   // E8
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.IMM },   // E9
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // EA
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.IMM },   // EB

      { name: 'CPX', operation: this.CPX, addressingMode: this.addressingModes.ABS },   // EC
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.ABS },   // ED
      { name: 'INC', operation: this.INC, addressingMode: this.addressingModes.ABSRW }, // EE
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.ABSRW }, // EF

      // F0
      { name: 'BEQ', operation: this.BEQ, addressingMode: this.addressingModes.REL },   // F0
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.IZY },   // F1
      { name: 'STP', operation: this.STP, addressingMode: this.addressingModes.IMP },   // F2
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.IZYRW }, // F3

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ZPX },   // F4
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.ZPX },   // F5
      { name: 'INC', operation: this.INC, addressingMode: this.addressingModes.ZPXRW }, // F6
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.ZPXRW }, // F7

      { name: 'SED', operation: this.SED, addressingMode: this.addressingModes.IMP },   // F8
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.ABYR },  // F9
      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.IMP },   // FA
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.ABYRW }, // FB

      { name: 'NOP', operation: this.NOP, addressingMode: this.addressingModes.ABXR },  // FC
      { name: 'SBC', operation: this.SBC, addressingMode: this.addressingModes.ABXR },  // FD
      { name: 'INC', operation: this.INC, addressingMode: this.addressingModes.ABXRW }, // FE
      { name: 'ISB', operation: this.ISB, addressingMode: this.addressingModes.ABXRW }, // FF
    ];
  }
  public cycle = 0;
  public bus: Bus;
  public _t: number = 0; // temporary private register to store bytes between cycles
  public fetch?: Instruction;
  public addressingModes: Nes6502AddressingModes; // Add addressingModes property
  private _getPreviousMicroCode() {
    return this.microCodeStack.pop() || (() => { });
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
  opCodeLookup: Instruction[];

  // Operations
  ADC() { // Add with Carry
    this.microCodeStack.push(() => {
      const m = this.a;
      const n = this.bus.data;
      const result = m + n + this.getFlag(Flags.C);
      this.a = result & 0xff;

      this.setFlag(Flags.C, result & 0x100);
      // formula taken from http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
      this.setFlag(Flags.V, (m ^ result) & (n ^ result) & 0x80);

      this.testNZFlags(result);
    })
  }
  SBC() { // Substract with carry
    // substraction works the same as addition with flipped bits on the second argument
    this.microCodeStack.push(() => {
      const m = this.a;
      const n = ~this.bus.data;
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
      this.a &= this.bus.data;

      this.testNZFlags(this.a);
    });
  }
  ASL() { // Arithmetic shift(1) left
    let result = 0;
    const p = this;
    function setFlags(result: number) {
      p.setFlag(Flags.N, result & 0x80); // test bit 7
      p.setFlag(Flags.Z, !(result & 0xff));
      p.setFlag(Flags.C, result & 0x100); // test bit 8
    }
    if (this.fetch?.addressingMode === this.addressingModes.IMP) {
      this.microCodeStack.push(() => {
        result = this.a << 1;
        this.a = result & 0xff;
        setFlags(result);
      });
    } else {
      this.microCodeStack.push(() => {
        result = this.bus.data << 1;
        this.bus.write(this.bus.addr, result & 0xff);
        setFlags(result);
      });
      this.NOP(); // allow the result to be saved before fetching the next instruction.
    }
  }
  LSR() { // Logical shift right
    if (this.fetch?.addressingMode === this.addressingModes.IMP) {
      this.microCodeStack.push(() => {
        this.setFlag(Flags.C, this.a & 0x1);
        this.a = this.a >> 1;
        this.testNZFlags(this.a);
      });
    } else {
      this.microCodeStack.push(() => {
        const result = this.bus.data >> 1;
        this.setFlag(Flags.C, this.bus.data & 0x1);
        this.testNZFlags(result);
        this.bus.write(this.bus.addr, result);
      });
      this.NOP();
    }
  }
  BIT() { // test bits
    this.microCodeStack.push(() => {
      this.setFlag(Flags.N, this.bus.data & 0x80); // test bit 7
      this.setFlag(Flags.Z, !(this.bus.data & this.a));
      this.setFlag(Flags.V, this.bus.data & 0x40); // test bit 6
    });
  }
  private _BRA(shouldBranch: boolean) { // Generic branch
    this.microCodeStack.push(() => {
      this.pc++;
      if (shouldBranch) {
        const hi = this.pc & 0xff00;
        const lo = (this.pc & 0xff) + this.bus.data;

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
        const lo = (this.pc & 0xff) + this.bus.data;
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
      this.bus.read(0xfffe);
    });
    this.microCodeStack.push(() => {
      this.pc = this.bus.data
      this.bus.read(0xffff);
    });
    this.microCodeStack.push(() => {
      this.pc |= this.bus.data << 8;
    });
    throw new Error('Break!');
  }
  private _CPA(reg: number) { // generic compare
    this.microCodeStack.push(() => {
      const m = reg;
      const n = this.bus.data ^ 0xff;
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
      this.bus.write(this.bus.addr, this.bus.data - 1);
      this.testNZFlags(this.bus.data);
    });
    this.NOP();
  }
  INC() { // Increment memory
    this.microCodeStack.push(() => {
      this.bus.write(this.bus.addr, this.bus.data + 1);
      this.testNZFlags(this.bus.data);
    });
    this.NOP();
  }
  EOR() { // exclusive or
    this.microCodeStack.push(() => {
      this.a ^= this.bus.data;
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
      this.pc = this.bus.addr;
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
      this.bus.read(this.pc);
    });
    this.microCodeStack.push(() => { // cycle 3
      this._t = this.bus.data;
      this.pc++;
      this.bus.read(0x100 | this.stackPointer);
    });
    this.microCodeStack.push(() => {
      this.pushStack(this.pc >> 8);
    })
    this.microCodeStack.push(() => { // cycle 4
      this.pushStack((this.pc) & 0xff);
    });
    this.microCodeStack.push(() => { // cycle 5
      this.bus.read(this.pc);
    });
    this.microCodeStack.push(() => { // cycle 6
      this.pc = (this.bus.data << 8) | (this._t & 0xff);
    });
  }
  LDA() { // Load A
    this.microCodeStack.push(() => {
      this.a = this.bus.data;
      this.testNZFlags(this.a);
    });
  }
  LDX() { // Load X
    this.microCodeStack.push(() => {
      this.x = this.bus.data;
      this.testNZFlags(this.x);
    });
  }
  LDY() { // Load Y
    this.microCodeStack.push(() => {
      this.y = this.bus.data;
      this.testNZFlags(this.y);
    });
  }
  NOP() { // no operation
    this.microCodeStack.push(() => { });
  }
  ORA() { // Bitwise OR with accumulator
    this.microCodeStack.push(() => {
      this.a |= this.bus.data;
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
    if (this.fetch?.addressingMode === this.addressingModes.IMP) {
      this.microCodeStack.push(() => {
        this.a = rotate(this.a) & 0xff;
      });
    } else {
      this.microCodeStack.push(() => {
        this.bus.write(this.bus.addr, rotate(this.bus.data) & 0xff);
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
    if (this.fetch?.addressingMode === this.addressingModes.IMP) {
      this.microCodeStack.push(() => {
        this.a = rotate(this.a) & 0xff;
      });
    } else {
      this.microCodeStack.push(() => {
        this.bus.write(this.bus.addr, rotate(this.bus.data) & 0xff);
      });
      this.NOP();
    }
  }
  RTI() { // Return from Interrupt
    this.microCodeStack.push(() => {
      this.pc++;
      this.bus.read(this.pc);
    })
    this.microCodeStack.push(() => {
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this.status = this.bus.data;
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this.pc = this.bus.data;
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this.pc |= this.bus.data << 8;
    });
  }
  RTS() { // Return from SubRoutine
    this.microCodeStack.push(() => {
      this.pc++;
      this.bus.read(this.pc);
    })
    this.microCodeStack.push(() => {
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this._t = this.bus.data;
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this._t |= (this.bus.data << 8);
      this.bus.read(this.stackPointer);
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
      this.bus.write(this.bus.addr, v);
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
      this.bus.read(this.pc);
    });
    this.microCodeStack.push(() => {
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this.a = this.bus.data;
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
      this.bus.read(this.pc);
    })
    this.microCodeStack.push(() => {
      this.popStack();
    });
    this.microCodeStack.push(() => {
      this.status = this.bus.data;
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
      this.x = this.a = this.bus.data;
      this.testNZFlags(this.a);
    });
  }
  DCP() {
    this.microCodeStack.push(() => {
      // DEC
      this.bus.write(this.bus.addr, this.bus.data - 1);

      // CMP
      const m = this.a;
      const n = this.bus.data ^ 0xff;
      const result = m + n + 1;
      this.setFlag(Flags.C, result & 0x100);
      this.testNZFlags(result);
    });
    this.NOP();
  }
  ISB() { // Aka ISC
    this.microCodeStack.push(() => {
      this.bus.write(this.bus.addr, this.bus.data + 1);
      this.testNZFlags(this.bus.data);
    });
    this.SBC();
  }
  ANC() {
    this.microCodeStack.push(() => {
      this.a &= this.bus.data;
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
      this.a = this.x & this.bus.data;
      this.testNZFlags(this.a);
    })
  }
  AXS() {
    this.CMP();
    this.DEX();
  }
  AHX() {
    this.microCodeStack.push(() => {
      this.bus.write(this.bus.addr, this.a & this.x & (this.bus.addr >> 8));
    });
    this.NOP()
  }
  SHY() {
    this.microCodeStack.push(() => {
      this.bus.write(this.bus.addr, this.y & (this.bus.addr >> 8));
    });
    this.NOP();
  }
  SHX() {
    this.microCodeStack.push(() => {
      this.bus.write(this.bus.addr, this.x & (this.bus.addr >> 8));
    });
    this.NOP();
  }
  TAS() {
    this.microCodeStack.push(() => {
      this.stackPointer = this.a & this.x;
      this.bus.write(this.bus.addr, this.stackPointer & (this.bus.addr >> 8));
    });
    this.NOP();
  }
  LAS() {
    this.microCodeStack.push(() => {
      this.a = this.x = this.stackPointer = this.bus.data & this.stackPointer;
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

      this.bus.read(0xfffc);
    });
    this.microCodeStack.push(() => {
      this._t = this.bus.data;
      this.bus.read(0xfffd);
    });
    this.microCodeStack.push(() => {
      this.pc = this._t | (this.bus.data << 8);
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
      this.bus.read(0xfffe);
    });
    this.microCodeStack.push(() => {
      this._t = this.bus.data;
      this.bus.read(0xffff);
    });
    this.microCodeStack.push(() => {
      this.pc = this._t | (this.bus.data >> 8);
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
      this.bus.read(0xfffa);
    });
    this.microCodeStack.push(() => {
      this._t = this.bus.data;
      this.bus.read(0xfffb);
    });
    this.microCodeStack.push(() => {
      this.pc = this._t | (this.bus.data >> 8);
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
        this.bus.read(this.pc);
      }
    } else {
      this.fetch = this.opCodeLookup[this.bus.data];
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
    this.bus.write(0x100 | this.stackPointer, value);
    this.stackPointer--;
  }
  public popStack() {
    this.stackPointer++;
    this.bus.read(0x100 | this.stackPointer);
  }
  public testNZFlags(v: number) {
    this.setFlag(Flags.N, v & 0x80);
    this.setFlag(Flags.Z, !(v & 0xff));
  }
  public absRead() {
    this.bus.read((this.bus.data << 8) | this._t);
  }
  public absWrite(v: number) {
    this.bus.write((this.bus.data << 8) | this._t, v);
  }
}