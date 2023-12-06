export interface Logger {
    log: (message?:any, ...optionalParams: any[]) => void
}

type EventHandlerFunction = (eventObject?:any) => void;

class DummyLogger implements Logger {
    log() {}
}

export class EventHandler {
    constructor (logger: Logger = new DummyLogger()) {
        this.logger = logger;
    }

    private _eventDictionary: { [eventId: string]: EventHandlerFunction[]} = {};
    public logger: Logger;
    on(event: string, handler: EventHandlerFunction): number {
        let handlerArray: EventHandlerFunction[] = [];
        if (!this._eventDictionary[event]) {
            this._eventDictionary[event] = handlerArray;
        } else {
            handlerArray = this._eventDictionary[event];
        }

        return handlerArray.push(handler) - 1;
    }
    off(event: string, handlerId: number): boolean {
        const handlerArray = this._eventDictionary[event];

        if (!handlerArray) {
            return false;
        }
        delete handlerArray[handlerId];
        return true;
    }
    broadcast(event: string, eventObject?:any) {
        this._eventDictionary[event]?.forEach(handler => handler && handler(eventObject));
    }

}