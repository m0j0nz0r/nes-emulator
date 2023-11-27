"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const emulator_1 = require("./components/emulator");
const emulator = new emulator_1.Emulator();
const rom = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.nes'));
emulator.loadCartridge(rom);
//# sourceMappingURL=index.js.map