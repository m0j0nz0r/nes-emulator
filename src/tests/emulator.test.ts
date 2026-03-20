import {Emulator} from '../components/emulator';
import {defaultPaletteData} from '../palettes/defaultPalette';

describe('Emulator', () => {
  let emulator: Emulator;

  beforeEach(() => {
    emulator = new Emulator(defaultPaletteData);
  });

  test('should initialize correctly', () => {
    expect(emulator).toBeDefined();
  });

  // Add more tests here
});
