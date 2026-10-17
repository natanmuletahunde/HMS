import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(topic: string, payload: any) {
    this.emitter.emit(topic, payload);
  }

  subscribe(topic: string, handler: (payload: any) => void) {
    this.emitter.on(topic, handler);
  }
}
