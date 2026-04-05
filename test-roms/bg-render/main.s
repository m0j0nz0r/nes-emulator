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
  lda #$3F
  sta $2006
  lda #$00
  sta $2006
  lda #$11        ; Blue color
  sta $2007

  ; Clear nametable (fill with empty tile)
  ; Turn on background rendering
  lda #%00001000      ; Background only
  sta $2001

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

