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

        function checkLog(finalMessage: string): string {
            const msgArray = finalMessage.trim().split(' ');
            const idx = Number.parseInt(msgArray[0]) - 1;
            const log = logger._targetLog[idx];
            // current addr
            if (msgArray[1] !== log?.substring(0, 4)) {
                return 'ADDR ' + log;
            }
            // code
            if (msgArray[2] !== log?.substring(6, 8)) {
                return 'CODE ' + log;
            }
            // op
            if (msgArray[3] !== log?.substring(16, 19)) {
                return 'OP ' + log;
            }
            // A
            if (msgArray[4].split(':')[1] !== log?.substring(50, 52)) {
                return 'A ' + log;
            }
            // X
            if (msgArray[5].split(':')[1] !== log?.substring(55, 57)) {
                return 'X ' + log;
            }
            // Y
            if (msgArray[6].split(':')[1] !== log?.substring(60, 62)) {
                return 'Y ' + log;
            }
            // P
            if (msgArray[7].split(':')[1] !== log?.substring(65, 67)) {
                return 'P ' + log;
            }
            // SP
            if (msgArray[8].split(':')[1] !== log?.substring(71, 73)) {
                return 'SP ' + log;
            }
            return '';
        }
        const check = checkLog(finalMessage);
        if (check) {
            return console.log('%c' + finalMessage + ' | ' + check, 'color:red');
        }
        console.log(finalMessage);
    };
}
const emulator = new Emulator(new CustomLogger());
const rom = fs.readFileSync(path.join(__dirname, 'testRoms/nestest.nes'));
emulator.loadCartridge(rom);
emulator.start();