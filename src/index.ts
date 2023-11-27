import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from "./components/emulator";

const emulator = new Emulator();
const rom = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.nes'));
emulator.loadCartridge(rom);
