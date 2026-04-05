.segment "HEADER"
  .byte "NES", $1A
  .byte $02
  .byte $01
  .byte %00000000
  .byte %00000000
  .res  8, $00

.segment "CHR"
  .res $2000, $00

