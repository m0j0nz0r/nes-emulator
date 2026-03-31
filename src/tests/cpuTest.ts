import * as fs from 'fs';
import * as path from 'path';
import {Emulator} from '../components/emulator';

interface CpuState {
  busAddr: number;
  busData: number;
  cpuFetchName: string;
  cpuA: number;
  cpuX: number;
  cpuY: number;
  cpuStatus: number;
  cpuStackPointer: number;
  cpuCycle: number;
}

interface PpuState {
  scanLine: number;
  cycle: number;
}

interface EmulationState {
  cpuState: CpuState;
  ppuState: PpuState;
}

function getEmulationState(emulator: Emulator): EmulationState {
  return {
    cpuState: {
      busAddr: emulator.bus.addr,
      busData: emulator.bus.data,
      cpuFetchName: emulator.cpu.fetch?.name || '',
      cpuA: emulator.cpu.a,
      cpuX: emulator.cpu.x,
      cpuY: emulator.cpu.y,
      cpuStatus: emulator.cpu.status,
      cpuStackPointer: emulator.cpu.stackPointer,
      cpuCycle: emulator.cpu.cycle,
    },
    ppuState: {
      scanLine: emulator.ppu.scanLine,
      cycle: emulator.ppu.cycle,
    },
  };
}
function parseLogLine(logLine: string): EmulationState {
  const log = logLine.trim();

  return {
    cpuState: {
      busAddr: parseInt(log.substring(0, 4), 16),
      busData: parseInt(log.substring(6, 8), 16),
      cpuFetchName: log.substring(16, 19).trim(),
      cpuA: parseInt(log.substring(50, 52), 16),
      cpuX: parseInt(log.substring(55, 57), 16),
      cpuY: parseInt(log.substring(60, 62), 16),
      cpuStatus: parseInt(log.substring(65, 67), 16),
      cpuStackPointer: parseInt(log.substring(71, 73), 16),
      cpuCycle: parseInt(log.substring(90).trim(), 10),
    },
    ppuState: {
      scanLine: parseInt(log.substring(90).trim(), 10),
      cycle: parseInt(log.substring(90).trim(), 10),
    },
  };
}
function compareCpuState(
  state: CpuState,
  expectedState: CpuState
): string | null {
  if (state.busAddr !== expectedState.busAddr) {
    return `ADDR expected: ${expectedState.busAddr.toString(
      16
    )} | got: ${state.busAddr.toString(16)}`;
  }
  if (state.busData !== expectedState.busData) {
    return `DATA expected: ${expectedState.busData.toString(
      16
    )} | got: ${state.busData.toString(16)}`;
  }
  if (state.cpuFetchName !== expectedState.cpuFetchName) {
    return `OP expected: ${expectedState.cpuFetchName} | got: ${state.cpuFetchName}`;
  }
  if (state.cpuA !== expectedState.cpuA) {
    return `A expected: ${expectedState.cpuA.toString(
      16
    )} | got: ${state.cpuA.toString(16)}`;
  }
  if (state.cpuX !== expectedState.cpuX) {
    return `X expected: ${expectedState.cpuX.toString(
      16
    )} | got: ${state.cpuX.toString(16)}`;
  }
  if (state.cpuY !== expectedState.cpuY) {
    return `Y expected: ${expectedState.cpuY.toString(
      16
    )} | got: ${state.cpuY.toString(16)}`;
  }
  if (state.cpuStatus !== expectedState.cpuStatus) {
    return `P expected: ${expectedState.cpuStatus.toString(
      16
    )} | got: ${state.cpuStatus.toString(16)}`;
  }
  if (state.cpuStackPointer !== expectedState.cpuStackPointer) {
    return `SP expected: ${expectedState.cpuStackPointer.toString(
      16
    )} | got: ${state.cpuStackPointer.toString(16)}`;
  }
  if (state.cpuCycle !== expectedState.cpuCycle) {
    return `CYC expected: ${expectedState.cpuCycle} | got: ${state.cpuCycle}`;
  }
  return null;
}

// other compare functions for PPU state and overall emulation for future tests with more detailed logging
// comment them out to shut up the linter

// function comparePpuState(
//   state: PpuState,
//   expectedState: PpuState
// ): string | null {
//   if (state.scanLine !== expectedState.scanLine) {
//     return `SL ${expectedState.scanLine}`;
//   }
//   if (state.cycle !== expectedState.cycle) {
//     return `SC ${expectedState.cycle}`;
//   }
//   return null;
// }

// function compareEmulationState(
//   state: EmulationState,
//   expectedState: EmulationState
// ): string | null {
//   const cpuComparison = compareCpuState(state.cpuState, expectedState.cpuState);
//   if (cpuComparison) {
//     return cpuComparison;
//   }
//   const ppuComparison = comparePpuState(state.ppuState, expectedState.ppuState);
//   if (ppuComparison) {
//     return ppuComparison;
//   }
//   return null;
// }

export async function cpuTest(): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    try {
      // Create new emulator instance
      const emulator = new Emulator();

      // Load test ROM and target log
      const rom = fs.readFileSync(
        path.join('src/tests/testRoms/nestest/nestest.nes')
      );
      const targetLog = fs
        .readFileSync(
          path.join('src/tests/testRoms/nestest/nestest.log'),
          'utf-8'
        )
        .split('\n');
      let logLineIndex = 0;

      // Set up emulator and event listeners
      emulator.loadCartridge(rom);

      // The reset sequence would have the cpu look for the reset vector at 0xfffc, but we want to skip that and set the PC to 0xc000 directly to start executing the test code.
      emulator.cpu.microCodeStack.shift();
      emulator.cpu.microCodeStack.push(() => {
        emulator.cpu.pc = 0xc000;
      });
      emulator.cpu.on('fetch', () => {
        const state = getEmulationState(emulator);
        const expectedState = parseLogLine(targetLog[logLineIndex]);
        logLineIndex++;

        const comparisonResult = compareCpuState(
          state.cpuState,
          expectedState.cpuState
        );
        if (comparisonResult) {
          console.error(
            `Mismatch at line ${logLineIndex}: ${comparisonResult}`
          );
          resolve(false);
          emulator.stop();
          return;
        }

        if (logLineIndex === targetLog.length) {
          resolve(true);
          emulator.stop();
        }
      });
      // Start the emulator
      emulator.start();
    } catch (e) {
      console.error(e);
      resolve(false);
    }
  });
}
