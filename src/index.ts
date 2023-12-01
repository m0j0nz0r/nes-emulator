import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from "./components/emulator";

const emulator = new Emulator();
const rom = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.nes'));
const targetLog = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.log'));
emulator.loadCartridge(rom);
emulator.start();