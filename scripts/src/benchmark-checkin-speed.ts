/**
 * Phase 4: Non-Functional Requirements & Performance SLAs
 * Benchmark 2: Check-In & Check-Out Execution Speed Benchmark (SRS Section 5.1)
 *
 * SLA Mandate:
 *   - "Process check-in and check-out within 5 seconds"
 *
 * Verifies the complete lifecycle execution speed:
 *   1. Room availability lookup & guest profile retrieval
 *   2. Check-in processing transaction (reservation -> checked_in, room -> occupied, folio setup)
 *   3. RFID Keycard hardware encoding simulation (Mifare-Classic-1K protocol)
 *   4. Check-out processing transaction (reservation -> checked_out, room -> cleaning, invoice balance settling)
 */

import { pool } from './db-helper';

interface CheckinBenchmarkResult {
  step: string;
  durationMs: number;
  slaTargetMs: number;
  passed: boolean;
  details?: any;
}

export async function runCheckinSpeedBenchmark(baseUrl: string = process.env.API_URL || 'http://localhost:8080') {
  console.log(`\n======================================================`);
  console.log(`⏱️  RUNNING CHECK-IN & CHECK-OUT SPEED SLA BENCHMARK`);
  console.log(`======================================================`);
  console.log(`Target Host:       ${baseUrl}`);
  console.log(`SLA Mandate:       Process within 5.0 seconds (5000 ms)`);

  const results: CheckinBenchmarkResult[] = [];

  // 1. Authenticate as Front Desk / Admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexushms.com', password: 'Admin@1234' }),
  });
  if (!loginRes.ok) throw new Error(`Authentication failed with status ${loginRes.status}`);
  const { accessToken } = ((await loginRes.json()) as any) || {};
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  // 2. Fetch or create a test guest and room
  const guestsRes = await fetch(`${baseUrl}/api/guests?limit=1`, { headers });
  const guestsData: any = await guestsRes.json();
  let guestId = guestsData.data?.[0]?.id;

  if (!guestId) {
    const createGuestRes = await fetch(`${baseUrl}/api/guests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        firstName: 'Benchmark',
        lastName: 'Guest',
        email: `bench-${Date.now()}@test.com`,
        phone: '+251911998877',
        fayidaId: 'FAN-999888777',
      }),
    });
    const newGuest: any = await createGuestRes.json();
    guestId = newGuest.id;
  }

  const roomsRes = await fetch(`${baseUrl}/api/rooms?limit=1`, { headers });
  const roomsData: any = await roomsRes.json();
  const testRoom = roomsData.data?.[0];
  if (!testRoom) throw new Error('No test room available in database.');

  // Create a clean confirmed reservation for this benchmark
  const checkInDate = new Date().toISOString().split('T')[0];
  const checkOutDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

  const createResRes = await fetch(`${baseUrl}/api/reservations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      guestId,
      roomId: testRoom.id,
      roomTypeId: testRoom.roomTypeId,
      checkInDate,
      checkOutDate,
      adults: 1,
      children: 0,
      totalAmount: 3500,
      status: 'confirmed',
    }),
  });

  const reservation: any = await createResRes.json();
  if (!reservation.id) {
    throw new Error(`Failed to create test reservation: ${JSON.stringify(reservation)}`);
  }
  const reservationId = reservation.id;

  // --- BENCHMARK STEP 1: CHECK-IN EXECUTION SPEED ---
  const t0 = performance.now();
  const checkinRes = await fetch(`${baseUrl}/api/reservations/${reservationId}/check-in`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      keyCardNumber: 'CARD-TEMP-01',
      depositCollected: true,
      depositAmount: 500,
      identityVerified: true,
      digitalSignature: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==',
      checkedInBy: 'Front Desk Lead',
    }),
  });
  const t1 = performance.now();
  const checkinDuration = Math.round((t1 - t0) * 100) / 100;
  const checkinSuccess = checkinRes.ok;

  results.push({
    step: 'Guest Check-In Transaction',
    durationMs: checkinDuration,
    slaTargetMs: 5000,
    passed: checkinSuccess && checkinDuration < 5000,
    details: { status: checkinRes.status },
  });

  // --- BENCHMARK STEP 2: RFID KEYCARD ENCODING INTERFACE SPEED ---
  // Retrieve the generated checkin record ID
  const checkinListRes = await fetch(`${baseUrl}/api/checkins?search=${testRoom.roomNumber || ''}`, { headers });
  const checkinList: any = await checkinListRes.json();
  const checkinRecord = checkinList.data?.[0];

  let encodeDuration = 0;
  if (checkinRecord?.id) {
    const t2 = performance.now();
    const encodeRes = await fetch(`${baseUrl}/api/checkins/${checkinRecord.id}/encode-keycard`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expirationDays: 2 }),
    });
    const t3 = performance.now();
    encodeDuration = Math.round((t3 - t2) * 100) / 100;
    results.push({
      step: 'RFID Keycard Encoding (Mifare-Classic-1K)',
      durationMs: encodeDuration,
      slaTargetMs: 2000,
      passed: encodeRes.ok && encodeDuration < 2000,
      details: { status: encodeRes.status },
    });
  }

  // --- BENCHMARK STEP 3: CHECK-OUT EXECUTION SPEED ---
  const t4 = performance.now();
  const checkoutRes = await fetch(`${baseUrl}/api/reservations/${reservationId}/check-out`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      totalCharges: 3500,
      depositRefunded: true,
      feedbackRating: 5,
      feedbackNotes: 'Benchmark automated verification stay.',
      checkedOutBy: 'Front Desk Lead',
    }),
  });
  const t5 = performance.now();
  const checkoutDuration = Math.round((t5 - t4) * 100) / 100;

  results.push({
    step: 'Guest Check-Out & Folio Settling',
    durationMs: checkoutDuration,
    slaTargetMs: 5000,
    passed: checkoutRes.ok && checkoutDuration < 5000,
    details: { status: checkoutRes.status },
  });

  console.log(`\n📊 SPEED BENCHMARK RESULTS:`);
  console.log(`-------------------------------------------------------------------------`);
  console.log(`Step Name                                | Latency   | SLA Limit | Result`);
  console.log(`-------------------------------------------------------------------------`);
  for (const r of results) {
    const padName = r.step.padEnd(40, ' ');
    const padLat = `${r.durationMs} ms`.padEnd(9, ' ');
    const padSla = `< ${r.slaTargetMs} ms`.padEnd(9, ' ');
    const res = r.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${padName} | ${padLat} | ${padSla} | ${res}`);
  }
  console.log(`-------------------------------------------------------------------------`);

  const allPassed = results.every((r) => r.passed);
  console.log(`Overall Front-Desk Processing SLA: ${allPassed ? '✅ ALL BENCHMARKS PASSED' : '❌ SLA BREACHED'}\n`);

  return { results, allPassed };
}

if (process.argv[1]?.endsWith('benchmark-checkin-speed.ts')) {
  runCheckinSpeedBenchmark().catch(console.error);
}
