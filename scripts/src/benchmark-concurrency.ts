/**
 * Phase 4: Non-Functional Requirements & Performance SLAs
 * Benchmark 1: High-Concurrency & Latency Verification (SRS Section 5.1)
 *
 * Simulates 1,000 requests across major system routes with worker pooling.
 * SLA Mandate:
 *   - Average response time under 2.0s (2000 ms)
 *   - Concurrency support for up to 1,000 active sessions
 *   - 0% unhandled error rate
 */

interface BenchmarkConfig {
  baseUrl: string;
  totalRequests: number;
  concurrency: number;
}

interface LatencyStats {
  total: number;
  success: number;
  failed: number;
  elapsedMs: number;
  rps: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export async function runConcurrencyBenchmark(
  config: BenchmarkConfig = {
    baseUrl: process.env.API_URL || 'http://localhost:8080',
    totalRequests: 1000,
    concurrency: 50,
  }
): Promise<LatencyStats> {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING 1,000 REQUEST CONCURRENCY & LATENCY BENCHMARK`);
  console.log(`======================================================`);
  console.log(`Target Host:       ${config.baseUrl}`);
  console.log(`Total Requests:    ${config.totalRequests}`);
  console.log(`Worker Pool Size:  ${config.concurrency} concurrent workers`);

  // 1. Authenticate to obtain JWT token
  let token = '';
  try {
    const loginRes = await fetch(`${config.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@nexushms.com', password: 'Admin@1234' }),
    });
    if (loginRes.ok) {
      const data = (await loginRes.json()) as any;
      token = data.accessToken;
      console.log(`✅ Authenticated admin session obtained.`);
    } else {
      console.warn(`⚠️ Login failed (${loginRes.status}), proceeding with public routes.`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Auth error: ${err.message}. Running against public endpoints.`);
  }

  const endpoints = [
    { path: '/api/health', method: 'GET', auth: false },
    { path: '/api/rooms', method: 'GET', auth: true },
    { path: '/api/room-types', method: 'GET', auth: true },
    { path: '/api/invoices', method: 'GET', auth: true },
    { path: '/api/housekeeping', method: 'GET', auth: true },
    { path: '/api/notifications/history', method: 'GET', auth: true },
  ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const latencies: number[] = [];
  let successCount = 0;
  let failedCount = 0;
  let requestIndex = 0;

  const startTime = Date.now();

  const statusMap: Record<number, number> = {};

  async function worker() {
    while (true) {
      const idx = requestIndex++;
      if (idx >= config.totalRequests) break;

      const ep = endpoints[idx % endpoints.length];
      const reqHeaders = ep.auth && token ? headers : { 'Content-Type': 'application/json' };
      const reqStart = performance.now();

      try {
        const res = await fetch(`${config.baseUrl}${ep.path}`, {
          method: ep.method,
          headers: reqHeaders,
        });

        const reqEnd = performance.now();
        const duration = reqEnd - reqStart;
        latencies.push(duration);
        statusMap[res.status] = (statusMap[res.status] || 0) + 1;

        if (res.ok || res.status < 400) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (err: any) {
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        statusMap[599] = (statusMap[599] || 0) + 1;
        failedCount++;
      }
    }
  }

  // Launch workers concurrently
  const workers = Array.from({ length: config.concurrency }, () => worker());
  await Promise.all(workers);

  const totalElapsedMs = Date.now() - startTime;
  latencies.sort((a, b) => a - b);

  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const avgMs = latencies.length ? sum / latencies.length : 0;
  const minMs = latencies.length ? latencies[0] : 0;
  const maxMs = latencies.length ? latencies[latencies.length - 1] : 0;

  const p = (pct: number) => {
    if (!latencies.length) return 0;
    const index = Math.min(Math.floor((pct / 100) * latencies.length), latencies.length - 1);
    return latencies[index];
  };

  const p50Ms = p(50);
  const p90Ms = p(90);
  const p95Ms = p(95);
  const p99Ms = p(99);
  const rps = totalElapsedMs > 0 ? (config.totalRequests / totalElapsedMs) * 1000 : 0;

  const stats: LatencyStats = {
    total: config.totalRequests,
    success: successCount,
    failed: failedCount,
    elapsedMs: totalElapsedMs,
    rps: Math.round(rps * 100) / 100,
    avgMs: Math.round(avgMs * 100) / 100,
    minMs: Math.round(minMs * 100) / 100,
    maxMs: Math.round(maxMs * 100) / 100,
    p50Ms: Math.round(p50Ms * 100) / 100,
    p90Ms: Math.round(p90Ms * 100) / 100,
    p95Ms: Math.round(p95Ms * 100) / 100,
    p99Ms: Math.round(p99Ms * 100) / 100,
  };

  console.log(`\n📊 BENCHMARK RESULTS:`);
  console.log(`------------------------------------------------------`);
  console.log(`Total Requests:      ${stats.total}`);
  console.log(`Successful Requests: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Failed Requests:     ${stats.failed}`);
  console.log(`Total Time Elapsed:  ${(stats.elapsedMs / 1000).toFixed(2)} seconds`);
  console.log(`Throughput (RPS):    ${stats.rps} requests/sec`);
  console.log(`Average Latency:     ${stats.avgMs} ms (SLA Target: < 2000 ms)`);
  console.log(`Min Latency:         ${stats.minMs} ms`);
  console.log(`P50 (Median):        ${stats.p50Ms} ms`);
  console.log(`P90:                 ${stats.p90Ms} ms`);
  console.log(`P95:                 ${stats.p95Ms} ms`);
  console.log(`P99:                 ${stats.p99Ms} ms`);
  console.log(`Max Latency:         ${stats.maxMs} ms`);
  console.log(`Status Codes:        ${JSON.stringify(statusMap)}`);
  console.log(`------------------------------------------------------`);

  const slaPassed = stats.avgMs < 2000 && stats.failed === 0;
  console.log(`SLA Verification (Average < 2.0s): ${slaPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

  return stats;
}

if (process.argv[1]?.endsWith('benchmark-concurrency.ts')) {
  runConcurrencyBenchmark().catch(console.error);
}
