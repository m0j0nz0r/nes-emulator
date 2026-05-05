; =============================================================
; main.s - Solid blue background (proof it renders)
; =============================================================
.segment "CODE"
reset:
  sei
  cld
  ldx #$FF
  txs

main:
  ; Disable everything while setting up
  lda #$00
  sta $2000
  sta $2001

  ; Wait for PPU to be ready
  jsr wait_vblank
  jsr wait_vblank

  ; Set background color to blue
  lda #$3F ; $3Fxx
  sta $2006
  lda #$00 ; $3F00
  sta $2006

  lda #$11 ; Blue color index
  sta $2007

  ldx #$01
load_palettes:
  txa
  sta $2007
  inx
  cpx #$10
  bne load_palettes

  ; Set name table entry to use tile #1
  ; Set PPU address to $2000 (Name Table 0)
  lda #$21
  sta $2006
  lda #$D0
  sta $2006
  lda #$01        ; Use tile #1
  sta $2007

  ; Reset scroll position
  bit $2002
  lda #$00
  sta $2006
  sta $2006
  sta $2005
  sta $2005

  ; Turn on background rendering
  lda #%00001000      ; Background only
  sta $2001

  ; Clear VBlank flag
  bit $2002

  lda #%10000000      ; Enable NMI
  sta $2000

loop:
  jmp loop            ; Stay here forever
wait_vblank:
  bit $2002
  bpl wait_vblank
  rts
nmi:
  rti
irq:
  rti
.segment "VECTORS"
  .word nmi
  .word reset
  .word irq

