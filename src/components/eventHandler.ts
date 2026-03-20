export interface Logger {
  log: (message?: string, ...optionalParams: string[]) => void;
}

type EventHandlerFunction = (eventObject?: unknown) => void;

class DummyLogger implements Logger {
  log() {}
}

export class EventHandler {
  constructor(logger: Logger = new DummyLogger()) {
    this.logger = logger;
  }

  private _eventDictionary: {[eventId: string]: EventHandlerFunction[]} = {};
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
  broadcast(event: string, eventObject?: unknown) {
    this._eventDictionary[event]?.forEach(
      handler => handler && handler(eventObject)
    );
  }
}
