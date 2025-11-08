import { Bus, ReadFlagState } from "./bus";
import { RAM } from "./RAM";

const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };

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

class PPUCTRLFlags {
    private _byte: number;
    constructor(byte: number) {
        this._byte = byte;
    }

    get nmiEnabled(): number {
        return this._byte >> 7;
    }
    get ppuMasterSlave(): number {
        return this._byte >> 6 & 0x1;
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
        const bits = (this._byte & 0x03);
        return 0x2000 + (bits * 0x400);
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
        return this._byte >> 1 & 0x1;
    }
    get showSpritesLeft8(): number {
        return this._byte >> 2 & 0x1;
    }
    get showBg(): number {
        return this._byte >> 3 & 0x1;
    }
    get showSprites(): number {
        return this._byte >> 4 & 0x1;
    }
    get emphasizeRed(): number {
        return this._byte >> 5 & 0x1;
    }
    get emphasizeGreen(): number {
        return this._byte >> 6 & 0x1;
    }
    get emphasizeBlue(): number {
        return this._byte >> 7 & 0x1;
    }
    get byte(): number {
        return this._byte;
    }
}

class PPUSTATUSFlags {
    private _byte: number;
    constructor(byte: number) {
        this._byte = byte & 0xe0; // only upper 3 bits are used
    }
    get spriteOverflow(): number {
        return this._byte >> 5 & 0x1;
    }
    get spriteZeroHit(): number {
        return this._byte >> 6 & 0x1;
    }
    get verticalBlank(): number {
        return this._byte >> 7 & 0x1;
    }
    set verticalBlank(value: number) {
        if (value) {
            this._byte |= 0x80;
        } else {
            this._byte &= 0x7f;
        }
    }

    get byte(): number {
        return this._byte;
    }
}
export class PPU {
    constructor(ioBus: Bus, graphicsBus: Bus) {
        this._ioBus = ioBus;
        this._graphicsBus = graphicsBus;
        this._controlFlags = new PPUCTRLFlags(0);
        this._maskFlags = new PPUMASKFlags(0);
        this._statusFlags = new PPUSTATUSFlags(0);
        
        this.VRAM = new RAM(this._graphicsBus, new Array(0x8000).fill(0), { minAddr: 0x0000, maxAddr: 0x3fff });
    }
    public VRAM: RAM;
    private _scanline: number = -1;
    private _cycle: number = 0;
    private _isEvenFrame: boolean = true;
    private _controlFlags: PPUCTRLFlags;
    private _maskFlags: PPUMASKFlags;
    private _statusFlags: PPUSTATUSFlags;
    private _OAM = new Array(256).fill(0); // Object Attribute Memory (OAM)
    private _OAMADDR = 0; // OAM address register
    private get _OAMDATA(): number {
        return this._OAM.at(this._OAMADDR) ?? 0;
    }
    private set _OAMDATA(value: number) {
        this._OAM[this._OAMADDR] = value & 0xff;
    }
    private get _tileAddress(): number {
        return 0x2000 | (this._V & 0x0fff);
    }
    private get _attributeAddress(): number {
        return 0x23C0 | (this._V & 0x0C00) | ((this._V >> 4) & 0x0038) | ((this._V >> 2) & 0x0007);
    }

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
    private _handleMainBus() {
        // make sure we are on our addressable space.
        if (this._ioBus.addr < mainAddrRange.minAddr || this._ioBus.addr > mainAddrRange.maxAddr) {
            return;
        }

        // We have 8 instrucitons mirrored over the 8kb addressable range.
        const addr = this._ioBus.addr !== 0x4014 ? (this._ioBus.addr & 0x7) + 0x2000 : this._ioBus.addr;
        const data = this._ioBus.data & 0xff;
        const rwFlag = this._ioBus.rwFlag;
        
        switch (addr) {
            case PPURegisters.PPUCTRL:
                if (rwFlag === ReadFlagState.write) {
                    this._controlFlags = new PPUCTRLFlags(data);
                    this._T = (this._T & 0b111_0011_1111_1111) | ((data & 0x3) << 10);
                }  else {
                    // PPUCTRL is write-only
                }
                break;
            case PPURegisters.PPUMASK:
                if (rwFlag === ReadFlagState.write) {
                    this._maskFlags = new PPUMASKFlags(data);
                } else {
                    // PPUMASK is write-only
                }
                break;
            case PPURegisters.PPUSTATUS:
                if (rwFlag === ReadFlagState.write) {
                    // PPUSTATUS is read-only
                } else {
                    this._W = 0; // reading PPUSTATUS resets write toggle
                    this._ioBus.data = this._statusFlags.byte & (this._ioBus.data & 0x1f); // lower 5 bits are open bus
                    this._statusFlags.verticalBlank = 0; // reading PPUSTATUS clears vblank
                }
                break;
            case PPURegisters.OAMADDR:
                if (rwFlag === ReadFlagState.write) {
                    this._OAMADDR = data & 0xff;
                } else {
                    this._ioBus.data = this._OAMADDR;
                }
                break;
            case PPURegisters.OAMDATA:
                if (rwFlag === ReadFlagState.write) {
                    if (this.isRendering()) {
                        // during rendering, writes to OAMDATA are glitched, and the OAMADDR does not increment
                        // we will disable writes during rendering for simplicity
                    } else {
                        this._OAMDATA = data & 0xff;
                        this._OAMADDR += 1;
                        this._OAMADDR &= 0xff;
                    }
                } else {
                    this._ioBus.data = this._OAMDATA;
                }
                break;
            case PPURegisters.PPUSCROLL:
                if (rwFlag === ReadFlagState.write) {
                    if (this._W === 0) {
                        this._T = (this._T & 0b1111_1111_1110_0000) | ((data & 0b11111000) >> 3);
                        this._X = data & 0x07;
                        this._W = 1;
                    } else {
                        /**
                         * $2005 (PPUSCROLL) second write (w is 1)
                         * t: FGH..AB CDE..... <- d: ABCDEFGH
                         */
                        // ABCDE
                        this._T = (this._T & 0b111_1100_0001_1111) | ((data & 0b1111_1000) << 2);
                        // FGH
                        this._T = (this._T & 0b000_1111_1111_1111) | ((data & 0b111) << 12);
                        this._W = 0;
                    }
                } else {
                    // PPUSCROLL is write-only
                }
                break;
            case PPURegisters.PPUADDR:
                if (rwFlag === ReadFlagState.write) {
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
                } else {
                    // PPUADDR is write-only
                }
                break;
            case PPURegisters.PPUDATA:
                if (this.isRendering()) {
                    // TODO weird glitchy behavior during rendering
                } else {
                    if (rwFlag === ReadFlagState.write) {
                        this._graphicsBus.write(this._V, data & 0xff);
                    }
                    this._V += this._controlFlags.incrementMode;
                    this._V &= 0x3fff;
                }
                break;
            case PPURegisters.OAMDMA:
                if (rwFlag === ReadFlagState.write) {
                    // TODO
                } else {
                    // OAMDMA is write-only
                }
                break;
            default:
                break;
        }
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
        return this._scanline === 261 || this._scanline === -1;
    }
    public get isVisibleScanline(): boolean {
        return this._scanline >= 0 && this._scanline <= 239;
    }

    public clock() {
        this._updateCycleCounters();
        this._handleMainBus();
        this._evaluateBackground();
        const isRenderingEnabled = this._maskFlags.showBg || this._maskFlags.showSprites;
        if (isRenderingEnabled) {
            switch (this._cycle) {
                case 256:
                    // increment vertical position
                    this._YIncrement();
                    break;
                case 257:
                    // copy horizontal position from t to v
                    const mask  = 0b1111011_11100000;
                    this._V = (this._V & mask) | (this._T & ~mask);
                    break;
                case 338:
                case 340:
                    // fetch next two tiles for next scanline
                    break;
            }
            if (this.isPreRenderingScanline && this._cycle >= 280 && this._cycle <= 304) {
                // copy vertical position from t to v
                const mask = 0b0000100_00011111;
                this._V = (this._V & mask) | (this._T & ~mask);
            }
            if ((this._cycle >= 328 || this._cycle <= 256) && this._cycle % 8 === 0) {
                this._coarseXIncrement();
            }
            this._oddFrameCycleSkip();
        }
    }

    private _coarseXIncrement() {
        if ((this._V & 0x001F) === 31) {
            this._V &= ~0x001F;             // coarse X = 0
            this._V ^= 0x0400;              // switch horizontal nametable
        } else {
            this._V += 1;
        }
    }
    private _YIncrement() {
        if ((this._V & 0x7000) !== 0x7000) {
            this._V += 0x1000; // increment fine Y
        } else {
            this._V &= ~0x7000; // fine Y = 0
            let y = (this._V & 0x03E0) >> 5; // get coarse Y
            if (y === 29) {
                y = 0;
                this._V ^= 0x0800; // switch vertical nametable
            } else if (y === 31) {
                y = 0; // coarse Y = 0, nametable not switched
            } else {
                y += 1;
            }
            this._V = (this._V & ~0x03E0) | (y << 5); // put coarse Y back
        }
    }

    private _oddFrameCycleSkip() {
        if (!this._isEvenFrame && this._scanline === 0 && this._cycle === 0) {
            // skip cycle on odd frames
            this._cycle = 1;
        }
    }

    private _updateCycleCounters() {
        this._cycle += 1;
        if (this._cycle > maxPixel) {
            this._cycle = 0;
        }
        if (this._cycle === 0) {
            this._scanline += 1;
            if (this._scanline > maxScanline) {
                this._scanline = 0;
                this._isEvenFrame = !this._isEvenFrame;
            }
        }
    }

    private _evaluateBackground() {
        /**
         * Fetch a nametable entry from $2000-$2FFF.
         * Fetch the corresponding attribute table entry from $23C0-$2FFF and increment the current VRAM address within the same row.
         * Fetch the low-order byte of an 8x1 pixel sliver of pattern table from $0000-$0FF7 or $1000-$1FF7.
         * Fetch the high-order byte of this sliver from an address 8 bytes higher.
         * Turn the attribute data and the pattern table data into palette indices, and combine them with data from sprite data using priority.
         */
        if (this._cycle !== 0 && (this.isVisibleScanline || this.isPreRenderingScanline)) {
            const subCycle = (this._cycle - 1) % 8;
            switch (subCycle) {
                case 0:
                    // Fetch nametable entry
                    this._graphicsBus.read(0x2000 | (this._V & 0x0fff));
                    break;
                case 1:
                    // Do stuff with nametable byte
                    break;
                case 2:
                    // Fetch attribute table entry
                    this._graphicsBus.read(0x23C0 | (this._V & 0x0C00) | ((this._V >> 4) & 0x0038) | ((this._V >> 2) & 0x0007));
                    break;
                case 3:
                    // Do stuff with attribute byte
                    break;
                case 4:
                    // Fetch low-order byte of pattern table
                    this._graphicsBus.read(0x1000 | (this._V & 0x0FFF));
                    break;
                case 5:
                    // Do stuff with pattern table byte
                    break;
                case 6:
                    // Fetch high-order byte of pattern table
                    this._graphicsBus.read(0x1000 | (this._V & 0x0FFF) | 0x0008);
                    break;
                case 7:
                    // Combine attribute data and pattern table data into palette indices
                    break;
            }
        }
    }
}
