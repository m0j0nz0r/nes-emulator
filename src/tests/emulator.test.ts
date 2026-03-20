import { Emulator } from '../components/emulator';
import * as fs from 'fs';
import *  as path from 'path';

describe('Emulator', () => {
  let emulator: Emulator;

  beforeEach(() => {
    const paletteData = fs.readFileSync(path.join(__dirname, '../palettes/2C02G_wiki.pal'));
    emulator = new Emulator(paletteData);
  });

  test('should initialize correctly', () => {
    expect(emulator).toBeDefined();
  });

  // Add more tests here
});