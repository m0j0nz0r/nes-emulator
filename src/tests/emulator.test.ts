import {Emulator} from '../components/emulator';
import {cpuTest} from './cpuTest';

describe('Emulator', () => {
  let emulator: Emulator;

  beforeEach(() => {
    emulator = new Emulator();
  });

  test('should initialize correctly', () => {
    expect(emulator).toBeDefined();
  });

  describe('golden log test', () => {
    test('should match the golden log', async () => {
      const result = await cpuTest();
      expect(result).toBe(true);
    });
  });
});
