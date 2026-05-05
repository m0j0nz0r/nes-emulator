.segment "HEADER"
  .byte "NES", $1A
  .byte $02
  .byte $01
  .byte %00000000
  .byte %00000000
  .res  8, $00

.segment "CHR"
  .res 16, $00
  .byte $18,$24,$5a,$bd,$bd,$5a,$24,$18
  .byte $00,$18,$3c,$7e,$7e,$3c,$18,$00
  .res $2000 - 32, $00

