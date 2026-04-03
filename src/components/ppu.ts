import {Bus, BusHandler, ReadFlagState} from './bus';
import {EventHandler, Logger} from './eventHandler';
import {RAM} from './RAM';

const horizontalPositionCopyMask = 0b1111011_11100000;
const mainAddrRange = {minAddr: 0x2000, maxAddr: 0x3fff};

const maxPixel = 341;
const maxScanline = 262;

enum PPURegisters {
  PPUCTRL = 0x2000,
  PPUMASK = 0x2001,
  PPUSTATUS = 0x2002,
  OAMADDR = 0x2003,
  OAMDATA = 0x2004,
  PPUSCROLL = 0x2005,
  PPUADDR = 0x2006,
  PPUDATA = 0x2007,
  OAMDMA = 0x4014,
}

function logInstruction(
  ppu: PPU,
  register: string,
  addr: number,
  data: number,
  rwFlag: ReadFlagState
) {
  const operation = rwFlag === ReadFlagState.read ? 'Read' : 'Write';
  ppu.logger.log(
    `${operation} ${register} ${addr.toString(16).padStart(4, '0')}: ${data
      .toString(2)
      .padStart(8, '0')} cycle: ${ppu.cycle} scanline: ${ppu.scanLine}`
  );
  ppu.broadcast('operation', {register, addr, data, rwFlag});
}

class PPUCTRLFlags {
  private _byte: number;
  constructor(byte: number) {
    this._byte = byte;
  }

  get nmiEnabled(): number {
    return this._byte >> 7;
  }
  get ppuMasterSlave(): number {
    return (this._byte >> 6) & 0x1;
  }
  get spriteHeight(): number {
    return (this._byte & 0x20) !== 0 ? 16 : 8;
  }
  get bgTileSelect(): number {
    return (this._byte & 0x10) !== 0 ? 0x1000 : 0x0000;
  }
  get spriteTileSelect(): number {
    return (this._byte & 0x08) !== 0 ? 0x1000 : 0x0000;
  }
  get incrementMode(): number {
    return (this._byte & 0x04) !== 0 ? 32 : 1;
  }
  get nametableSelect(): number {
    const bits = this._byte & 0x03;
    return 0x2000 + bits * 0x400;
  }
  get byte(): number {
    return this._byte;
  }
}

class PPUMASKFlags {
  private _byte: number;
  constructor(byte: number) {
    this._byte = byte;
  }
  get greyscale(): number {
    return this._byte & 0x01;
  }
  get showBgLeft8(): number {
    return (this._byte >> 1) & 0x1;
  }
  get showSpritesLeft8(): number {
    return (this._byte >> 2) & 0x1;
  }
  get showBg(): number {
    return (this._byte >> 3) & 0x1;
  }
  get showSprites(): number {
    return (this._byte >> 4) & 0x1;
  }
  get emphasizeRed(): number {
    return (this._byte >> 5) & 0x1;
  }
  get emphasizeGreen(): number {
    return (this._byte >> 6) & 0x1;
  }
  get emphasizeBlue(): number {
    return (this._byte >> 7) & 0x1;
  }
  get byte(): number {
    return this._byte;
  }
}

export class PPUSTATUSFlags {
  private _byte: number;
  constructor(byte: number) {
    this._byte = byte & 0xe0; // only upper 3 bits are used
  }
  get spriteOverflow(): number {
    return (this._byte >> 5) & 0x1;
  }
  get spriteZeroHit(): number {
    return (this._byte >> 6) & 0x1;
  }
  get verticalBlank(): number {
    return (this._byte >> 7) & 0x1;
  }
  set verticalBlank(value: number) {
    if (value) {
      this._byte |= 0x1 << 7;
    } else {
      this._byte &= ~(0x1 << 7);
    }
  }

  get byte(): number {
    return this._byte;
  }
}

function getCleanAddr(addr: number): number {
  const cleanAddr = addr !== 0x4014 ? (addr & 0x7) | 0x2000 : addr;
  return cleanAddr;
}
export class PPU extends EventHandler implements BusHandler {
  constructor(
    ioBus: Bus,
    graphicsBus: Bus,
    paletteData: Buffer,
    logger?: Logger
  ) {
    super(logger);
    this._ioBus = ioBus;
    this._graphicsBus = graphicsBus;
    this._controlFlags = new PPUCTRLFlags(0);
    this._maskFlags = new PPUMASKFlags(0);
    this.statusFlags = new PPUSTATUSFlags(0);

    this.VRAM = new RAM(
      this._graphicsBus,
      new Array(0x2000).fill(0),
      {
        minAddr: 0x2000,
        maxAddr: 0x3fff,
      },
      0x1fff
    );
    this._OAM = new RAM(
      this._graphicsBus,
      new Array(256).fill(0),
      {
        minAddr: 0x0000,
        maxAddr: 0x00ff,
      },
      0x00ff
    );

    this._palette = paletteData;
  }
  public nmi = false;
  public frameCounter = 0;
  public VRAM: RAM;
  public get screen(): Uint8ClampedArray {
    return this._screen;
  }
  private _screen = new Uint8ClampedArray(256 * 240 * 4); // RGBA for each pixel
  private _palette: Buffer;
  public scanLine = -1;
  public cycle = 0;
  private _isEvenFrame = true;
  private _controlFlags: PPUCTRLFlags;
  private _maskFlags: PPUMASKFlags;
  public statusFlags: PPUSTATUSFlags;
  private _OAM: RAM; // Object Attribute Memory (OAM)
  private _OAMADDR = 0; // OAM address register

  // Internal PPU registers
  private _v = 0; // current VRAM address (15 bits)
  private get _V(): number {
    return this._v;
  }
  private set _V(value: number) {
    this._v = value & 0x7fff;
  }

  private _t = 0; // temporary VRAM address (15 bits)
  private get _T(): number {
    return this._t;
  }
  private set _T(value: number) {
    this._t = value & 0x7fff;
  }
  private _x = 0; // fine X scroll (3 bits)
  private get _X(): number {
    return this._x;
  }
  private set _X(value: number) {
    this._x = value & 0x07;
  }
  private _W = 0; // write toggle (1 bit)

  private _ioBus: Bus;
  private _graphicsBus: Bus;

  public addressRange = mainAddrRange;
  public write(addr: number, data: number): void {
    const rwFlag = ReadFlagState.write;
    let instruction = '';
    addr = getCleanAddr(addr);

    switch (addr) {
      case PPURegisters.PPUCTRL:
        this._controlFlags = new PPUCTRLFlags(data);
        this._T = (this._T & 0b111_0011_1111_1111) | ((data & 0x3) << 10);
        instruction = 'PPUCTRL';
        break;
      case PPURegisters.PPUMASK:
        this._maskFlags = new PPUMASKFlags(data);
        instruction = 'PPUMASK';
        break;
      case PPURegisters.OAMADDR:
        this._OAMADDR = data;
        instruction = 'OAMADDR';
        break;
      case PPURegisters.OAMDATA:
        if (this.isRendering()) {
          // during rendering, writes to OAMDATA are glitched, and the OAMADDR does not increment
          // we will disable writes during rendering for simplicity
        } else {
          this._OAM.write(this._OAMADDR, data);
          this._OAMADDR++;
          this._OAMADDR &= 0xff;
        }
        instruction = 'OAMDATA';
        break;
      case PPURegisters.PPUSCROLL:
        if (this._W === 0) {
          this._T =
            (this._T & 0b1111_1111_1110_0000) | ((data & 0b11111000) >> 3);
          this._X = data & 0x07;
          this._W = 1;
        } else {
          /**
           * $2005 (PPUSCROLL) second write (w is 1)
           * t: FGH..AB CDE..... <- d: ABCDEFGH
           */
          // ABCDE
          this._T =
            (this._T & 0b111_1100_0001_1111) | ((data & 0b1111_1000) << 2);
          // FGH
          this._T = (this._T & 0b000_1111_1111_1111) | ((data & 0b111) << 12);
          this._W = 0;
        }
        instruction = 'PPUSCROLL';
        break;
      case PPURegisters.PPUADDR:
        if (this._W === 0) {
          /**
           * $2006 (PPUADDR) first write (w is 0)
           * t: .CDEFGH ........ <- d: ..CDEFGH
           *       <unused>     <- d: AB......
           * t: Z...... ........ <- 0 (bit Z is cleared)
           * w:                  <- 1
           */
          this._T = (this._T & 0b0111111_11111111) | ((data & 0b111111) << 8);
          this._W = 1;
        } else {
          /**
           * $2006 (PPUADDR) second write (w is 1)
           * t: ....... ABCDEFGH <- d: ABCDEFGH
           * w:                  <- 0
           *   (wait 1 to 1.5 dots after the write completes)
           * v: <...all bits...> <- t: <...all bits...>
           */
          this._T = (this._T & 0b1111111_00000000) | (data & 0xff);
          this._V = this._T;
          this._W = 0;
        }
        instruction = 'PPUADDR';
        break;
      case PPURegisters.PPUDATA:
        if (this.isRendering()) {
          // TODO weird glitchy behavior during rendering
        } else {
          this._graphicsBus.write(this._V, data & 0xff);
          this._V += this._controlFlags.incrementMode;
          this._V &= 0x3fff;
        }
        instruction = 'PPUDATA';
        break;
      case PPURegisters.OAMDMA:
        instruction = 'OAMDMA';
        const baseAddr = (data & 0xff) << 8;
        for (let i = 0; i < 256; i++) {
          this._OAM.write(this._OAMADDR + i, this._ioBus.read(baseAddr + i));
        }
        break;
    }
    logInstruction(this, instruction, addr, data, rwFlag);
  }

  public read(addr: number, data?: number): number {
    const rwFlag = ReadFlagState.read;
    let instruction = '';
    let result = 0;
    addr = getCleanAddr(addr);
    data = data ?? 0;

    switch (addr) {
      case PPURegisters.PPUSTATUS:
        this._W = 0; // reading PPUSTATUS resets write toggle
        result = this.statusFlags.byte | (data & 0x1f); // lower 5 bits are open bus
        this.statusFlags.verticalBlank = 0; // reading PPUSTATUS clears vblank
        instruction = 'PPUSTATUS';
        break;
      case PPURegisters.OAMADDR:
        result = this._OAMADDR;
        instruction = 'OAMADDR';
        break;
      case PPURegisters.OAMDATA:
        result = this._OAM.read(this._OAMADDR);
        instruction = 'OAMDATA';
        break;
      case PPURegisters.PPUDATA:
        if (this.isRendering()) {
          // during rendering, reads from PPUDATA are glitched,
          // and return open bus or the last byte read from the graphics bus
          result = data & 0xff;
        } else {
          this._V += this._controlFlags.incrementMode;
          this._V &= 0x3fff;
          result = this._graphicsBus.read(this._V);
        }
        instruction = 'PPUDATA';
        break;
    }
    logInstruction(this, instruction, addr, result, rwFlag);
    return result;
  }

  public isRendering(): boolean {
    if (!this._maskFlags.showBg && !this._maskFlags.showSprites) {
      return false;
    }
    if (this.isPreRenderingScanline || this.isVisibleScanline) {
      return true;
    }
    return false;
  }

  public get isPreRenderingScanline(): boolean {
    return this.scanLine === 261 || this.scanLine === -1;
  }
  public get isVisibleScanline(): boolean {
    return this.scanLine >= 0 && this.scanLine <= 239;
  }

  public clock() {
    this._updateCycleCounters();
    this._updateVBlankFlag();
    const isRenderingEnabled =
      this._maskFlags.showBg || this._maskFlags.showSprites;
    if (isRenderingEnabled) {
      if (this.cycle === 256) {
        // increment vertical position
        this._YIncrement();
      }
      this._updateV();
      this._coarseXIncrement();
      this._oddFrameCycleSkip();
    }

    this._evaluateBackground();
  }

  private _updateVBlankFlag() {
    if (this.cycle !== 1) {
      return;
    }
    if (this.scanLine === 241) {
      this.statusFlags.verticalBlank = 1;
      this.nmi = this._controlFlags.nmiEnabled ? true : false;
    } else if (this.scanLine === 261) {
      this.statusFlags.verticalBlank = 0;
    }
  }
  private _updateV() {
    switch (this.cycle) {
      case 256:
        // increment vertical position
        this._YIncrement();
        break;
      case 257:
        // copy horizontal position from t to v
        this._V =
          (this._V & horizontalPositionCopyMask) |
          (this._T & ~horizontalPositionCopyMask);
        break;
      case 338:
      case 340:
        // fetch next two tiles for next scanline
        break;
    }
    if (this.isPreRenderingScanline && this.cycle >= 280 && this.cycle <= 304) {
      // copy vertical position from t to v
      const mask = 0b0000100_00011111;
      this._V = (this._V & mask) | (this._T & ~mask);
    }
  }
  private _coarseXIncrement() {
    if (this.cycle & 8) {
      return;
    }
    if (this.cycle > 256 && this.cycle < 328) {
      return;
    }
    if ((this._V & 0x001f) === 31) {
      this._V &= ~0x001f; // coarse X = 0
      this._V ^= 0x0400; // switch horizontal nametable
    } else {
      this._V += 1;
    }
  }
  private _YIncrement() {
    if ((this._V & 0x7000) !== 0x7000) {
      this._V += 0x1000; // increment fine Y
    } else {
      this._V &= ~0x7000; // fine Y = 0
      let y = (this._V & 0x03e0) >> 5; // get coarse Y
      if (y === 29) {
        y = 0;
        this._V ^= 0x0800; // switch vertical nametable
      } else if (y === 31) {
        y = 0; // coarse Y = 0, nametable not switched
      } else {
        y += 1;
      }
      this._V = (this._V & ~0x03e0) | (y << 5); // put coarse Y back
    }
  }

  private _oddFrameCycleSkip() {
    if (!this._isEvenFrame && this.scanLine === 0 && this.cycle === 0) {
      // skip cycle on odd frames
      this.cycle = 1;
    }
  }

  private _updateCycleCounters() {
    this.cycle += 1;
    if (this.cycle > maxPixel) {
      this.cycle = 0;
    }
    if (this.cycle === 0) {
      this.scanLine += 1;
      if (this.scanLine > maxScanline) {
        this.scanLine = 0;
        this._isEvenFrame = !this._isEvenFrame;
        this.broadcast('frame', this._screen);
        this.frameCounter++;
      }
    }
  }

  private _nametableByte = 0;
  private _attributeByte = 0;
  private _patternLo = 0;
  private _patternHi = 0;
  private _currentAttributeBits = 0;
  private _evaluateBackground(): void {
    /**
     * Fetch a nametable entry from $2000-$2FFF.
     * Fetch the corresponding attribute table entry from $23C0-$2FFF and increment the current VRAM address within the same row.
     * Fetch the low-order byte of an 8x1 pixel sliver of pattern table from $0000-$0FF7 or $1000-$1FF7.
     * Fetch the high-order byte of this sliver from an address 8 byFtes higher.
     * Turn the attribute data and the pattern table data into palette indices, and combine them with data from sprite data using priority.
     */
    const isVisibleCycle = this.cycle >= 1 && this.cycle <= 256;
    const isPreRenderCycle = this.cycle >= 321 && this.cycle <= 336;
    if (!isVisibleCycle && !isPreRenderCycle) {
      return;
    }
    this._doBgFetch();

    if (!isVisibleCycle) {
      return;
    }
    this._doBgRender();
  }

  private _getAttributeBits(): number {
    const coarseX = this._V & 0x1f;
    const coarseY = (this._V & 0x03e0) >> 5;

    const tileX = coarseX & 0x1;
    const tileY = coarseY & 0x1;

    const pos = (tileY << 1) | tileX;

    return (this._attributeByte >> (pos << 1)) & 0x03;
  }

  private _doBgFetch() {
    const bgPatternTableAddress =
      this._controlFlags.bgTileSelect |
      (this._nametableByte << 4) |
      ((this._V >> 12) & 0x7);
    const subCycle = (this.cycle - 1) % 8;
    switch (subCycle) {
      case 0:
        // Fetch nametable entry
        this._nametableByte = this._graphicsBus.read(0x2000 | (this._V & 0x0fff));
        break;
      case 1:
        break;
      case 2:
        // Fetch attribute table entry
        this._attributeByte = this._graphicsBus.read(
          0x23c0 |
            (this._V & 0x0c00) |
            ((this._V >> 4) & 0x0038) |
            ((this._V >> 2) & 0x0007)
        );
        break;
      case 3:
        this._currentAttributeBits = this._getAttributeBits();
        break;
      case 4:
        // Fetch low-order byte of pattern table
        this._patternLo = this._graphicsBus.read(bgPatternTableAddress) << 8;
        break;
      case 5:
        // Fetch palette data
        break;
      case 6:
        // Fetch high-order byte of pattern table
        this._patternHi = this._graphicsBus.read(bgPatternTableAddress | 0x0008) << 8;
        break;
      case 7:
        break;
    }
  }

  private _doBgRender() {
    const patternBitHi = (this._patternHi >> this._X) & 0x1;
    const patternBitLo = (this._patternLo >> this._X) & 0x1;
    const patternIndex = (patternBitHi << 1) | patternBitLo;
    const bgPaletteIndex =
      ((this._currentAttributeBits << 2) | patternIndex) & 0x0f;

    this._patternLo >>= 1;
    this._patternHi >>= 1;

    if (this.isVisibleScanline) {
      const pixelIndex = (this.scanLine * 256 + this.cycle - 1) * 4;
      const colorOffset = bgPaletteIndex * 3;
      // this._screen[pixelIndex] = (this._cycle + this.frameCounter) & 0xff; // R
      // this._screen[pixelIndex + 1] = (this._scanline + this.frameCounter) & 0xff; // G
      // this._screen[pixelIndex + 2] = bgPaletteIndex * 16; // B
      this._screen[pixelIndex] = this._palette[colorOffset]; // R
      this._screen[pixelIndex + 1] = this._palette[colorOffset + 1]; // G
      this._screen[pixelIndex + 2] = this._palette[colorOffset + 2]; // B
      this._screen[pixelIndex + 3] = 255; // A
    }
  }
  public loadPalette(paletteData: Buffer) {
    this._palette = paletteData;
  }
}
