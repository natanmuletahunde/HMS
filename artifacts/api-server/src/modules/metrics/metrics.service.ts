import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  increment(name: string, value = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }

  observe(name: string, value: number) {
    const arr = this.histograms.get(name) ?? [];
    arr.push(value);
    if (arr.length > 1000) arr.shift(); // keep last 1000
    this.histograms.set(name, arr);
  }

  getCounter(name: string): number { return this.counters.get(name) ?? 0; }
  getGauge(name: string): number { return this.gauges.get(name) ?? 0; }

  toPrometheus(): string {
    const lines: string[] = [];
    for (const [k, v] of this.counters) {
      lines.push(`# TYPE ${k} counter`);
      lines.push(`${k} ${v}`);
    }
    for (const [k, v] of this.gauges) {
      lines.push(`# TYPE ${k} gauge`);
      lines.push(`${k} ${v}`);
    }
    for (const [k, arr] of this.histograms) {
      const sum = arr.reduce((a, b) => a + b, 0);
      const avg = arr.length ? sum / arr.length : 0;
      lines.push(`# TYPE ${k}_avg gauge`);
      lines.push(`${k}_avg ${avg.toFixed(2)}`);
      lines.push(`# TYPE ${k}_count counter`);
      lines.push(`${k}_count ${arr.length}`);
    }
    return lines.join('\n');
  }
}
