import { Bus, ReadFlagState } from "./bus";

const mainAddrRange = { minAddr: 0x2000, maxAddr: 0x3fff };

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
    }
    private _scanline: number = -1;
    private _controlFlags: PPUCTRLFlags;
    private _maskFlags: PPUMASKFlags;
    private _statusFlags: PPUSTATUSFlags;
    private _OAMADDR = 0; // OAM address register
    private _OAMDATA = 0; // OAM data register
    private _xScroll = 0; // X scroll
    private _yScroll = 0; // Y scroll
    private _PPUADDR = 0; // PPU address register

    // Internal PPU registers
    private _V = 0; // current VRAM address (15 bits)
    private _T = 0; // temporary VRAM address (15 bits)
    private _X = 0; // fine X scroll (3 bits)
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
                        this._OAMADDR = (this._OAMADDR + 1) & 0xff;
                        this._OAMDATA = data & 0xff;
                    }
                } else {
                    this._ioBus.data = this._OAMDATA;
                }
                break;
            case PPURegisters.PPUSCROLL:
                if (rwFlag === ReadFlagState.write) {
                    if (this._W === 0) {
                        this._xScroll = data & 0xff;
                        this._W = 1;
                    } else {
                        this._yScroll = data & 0xff;
                        this._W = 0;
                    }
                } else {
                    // PPUSCROLL is write-only
                }
                break;
            case PPURegisters.PPUADDR:
                if (rwFlag === ReadFlagState.write) {
                    if (this._W === 0) {
                        this._PPUADDR = ((data & 0x3f) << 8) | (this._PPUADDR & 0x00ff);
                        this._W = 1;
                    } else {
                        this._PPUADDR = (this._PPUADDR & 0xff00) | (data & 0xff);
                        this._W = 0;
                    }
                } else {
                    // PPUADDR is write-only
                }
                break;
            case PPURegisters.PPUDATA:
                if (rwFlag === ReadFlagState.write) {
                    // TODO
                } else {
                    // PPUDATA is write-only
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
        this._handleMainBus();
    }

}