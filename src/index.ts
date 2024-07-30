import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from "./components/emulator";
import { Logger } from './components/eventHandler';

class CustomLogger implements Logger {
    constructor () {
        this._targetLog = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.log'), 'utf-8').split('\n');
    }
    private _targetLog: string[];

    log (message?: any, ...optionalParams: any[]) {
        const logger = this;
        let finalMessage = '';
        finalMessage +=  message;
        if (optionalParams) {
            optionalParams.reduce((pv, cv) => pv + cv, finalMessage);
        }

        finalMessage += ` CYC:${emulator.cpu.cycle}`;

        function checkLog(finalMessage: string): string {
            const msgArray = finalMessage.trim().split(' ');
            const idx = Number.parseInt(msgArray[0]) - 1;
            const log = logger._targetLog[idx];
            if (!log) {
                throw new Error('No log found.');
            }
            // current addr
            if (msgArray[1] !== log.substring(0, 4)) {
                throw new Error('ADDR ' + log);
            }
            // code
            if (msgArray[2] !== log.substring(6, 8)) {
                throw new Error('CODE ' + log);
            }
            // op
            if (msgArray[3] !== log.substring(16, 19)) {
                throw new Error('OP ' + log);
            }
            // A
            if (msgArray[4].split(':')[1] !== log.substring(50, 52)) {
                throw new Error('A ' + log);
            }
            // X
            if (msgArray[5].split(':')[1] !== log.substring(55, 57)) {
                throw new Error('X ' + log);
            }
            // Y
            if (msgArray[6].split(':')[1] !== log.substring(60, 62)) {
                throw new Error('Y ' + log);
            }
            // P
            if (msgArray[7].split(':')[1] !== log.substring(65, 67)) {
                throw new Error('P ' + log);
            }
            // SP
            if (msgArray[8].split(':')[1] !== log.substring(71, 73)) {
                throw new Error('SP ' + log);
            }
            if (msgArray[9].split(':')[1].trim() !== log.substring(90).trim()) {
                throw new Error('CYC ' + log);
            }
            return log;
        }
        try {
            const check = checkLog(finalMessage);
            if (check) {
            }
            console.log(finalMessage + ' | ' + check);
    
        } catch (e) {
            console.log('%c' + finalMessage + ' | ' + e, 'color:red');
            throw new Error();
        }
    };
}
console.log('Starting...');
console.log('Creating emulator...');
const emulator = new Emulator(new CustomLogger());
console.log('Loading ROM...');
const rom = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.nes'));
emulator.loadCartridge(rom);
console.log('Setting initial state...');
emulator.cpu.cycle = 6;
emulator.cpu.pc = 0xc000;
emulator.cpu.on('fetch', cpuTestLog),
console.time('Execution');
emulator.on('stop', () => console.timeEnd('Execution'));
console.log('Start');
emulator.start();

function cpuTestLog() {
    if (emulator.cpu.microCodeStack.length) {
        return;
    }
    let log = '';
    log += emulator.cpu.count.toString().padStart(4, ' ');
    log += ' ' + emulator.bus.addr.toString(16).toUpperCase().padStart(4, '0');
    log += ' ' + emulator.bus.data.toString(16).toUpperCase().padStart(2, '0');
    log += ' ' + emulator.cpu.fetch?.name;
    log += ' A:' + emulator.cpu.a.toString(16).toUpperCase().padStart(2, '0'); 
    log += ' X:' + emulator.cpu.x.toString(16).toUpperCase().padStart(2, '0');
    log += ' Y:' + emulator.cpu.y.toString(16).toUpperCase().padStart(2, '0');
    log += ' P:' + emulator.cpu.status.toString(16).toUpperCase().padStart(2, '0');
    log += ' SP:' + emulator.cpu.stackPointer.toString(16).toUpperCase().padStart(2, '0');
    emulator.logger.log(log);
}