import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';
import type { CallerCtx } from '../../common/context/tenant-context';

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Safe helper: extract rows array from Drizzle execute result
function rows(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

// ─── Tenant isolation note ────────────────────────────────────────────────────
// Hotel-domain tables (rooms, reservations, payments, complaints) do not yet have
// a tenant_id column — that is added in Task #10 (row-level tenant isolation).
// Until that migration runs:
//   • Platform admins (ctx.tenantId === null)  → full data access
//   • Tenant users (ctx.tenantId !== null)      → empty result set; no cross-tenant
//     data is returned, preventing leakage.

@Injectable()
export class BiService {

  async getKpis(ctx: CallerCtx, period: 'day' | 'week' | 'month' = 'month') {
    // Tenant users cannot access unscoped data until Task #10 adds tenant columns
    if (ctx.tenantId !== null) {
      return this.emptyKpis(period);
    }

    const now = new Date();
    const daysMap = { day: 1, week: 7, month: 30 };
    const days = daysMap[period];
    const start = new Date(now.getTime() - days * 86400000);
    const prevStart = new Date(start.getTime() - days * 86400000);

    const [currentRevResult, prevRevResult, roomResult, complaintResult] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(amount), 0)::numeric as total FROM payments WHERE created_at >= ${start.toISOString()}`),
      db.execute(sql`SELECT COALESCE(SUM(amount), 0)::numeric as total FROM payments WHERE created_at >= ${prevStart.toISOString()} AND created_at < ${start.toISOString()}`),
      db.execute(sql`SELECT count(*)::int as total, COALESCE(sum(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END), 0)::int as occupied FROM rooms`),
      db.execute(sql`SELECT count(*)::int as total, COALESCE(sum(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END), 0)::int as resolved FROM complaints WHERE created_at >= ${start.toISOString()}`),
    ]);

    const currentRev = parseFloat(rows(currentRevResult)[0]?.total ?? '0');
    const prevRev = parseFloat(rows(prevRevResult)[0]?.total ?? '0');
    const totalRooms = parseInt(rows(roomResult)[0]?.total ?? '0');
    const occupiedRooms = parseInt(rows(roomResult)[0]?.occupied ?? '0');
    const totalComplaints = parseInt(rows(complaintResult)[0]?.total ?? '0');
    const resolvedComplaints = parseInt(rows(complaintResult)[0]?.resolved ?? '0');

    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    const adr = occupiedRooms > 0 ? currentRev / occupiedRooms : 0;
    const revpar = totalRooms > 0 ? currentRev / totalRooms : 0;
    const revenueChange = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : 0;
    const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 100;

    return {
      period,
      kpis: {
        occupancyRate: { value: parseFloat(occupancyRate.toFixed(1)), unit: '%', label: 'Occupancy Rate' },
        adr: { value: parseFloat(adr.toFixed(2)), unit: 'USD', label: 'Average Daily Rate' },
        revpar: { value: parseFloat(revpar.toFixed(2)), unit: 'USD', label: 'RevPAR' },
        revenue: { value: parseFloat(currentRev.toFixed(2)), unit: 'USD', label: 'Total Revenue', change: parseFloat(revenueChange.toFixed(1)) },
        complaintResolution: { value: parseFloat(resolutionRate.toFixed(1)), unit: '%', label: 'Complaint Resolution Rate' },
        occupiedRooms: { value: occupiedRooms, unit: 'rooms', label: 'Occupied Rooms' },
        totalRooms: { value: totalRooms, unit: 'rooms', label: 'Total Rooms' },
      },
    };
  }

  private emptyKpis(period: string) {
    return {
      period,
      _note: 'Full tenant-scoped KPIs require row-level isolation (upcoming schema migration).',
      kpis: {
        occupancyRate: { value: 0, unit: '%', label: 'Occupancy Rate' },
        adr: { value: 0, unit: 'USD', label: 'Average Daily Rate' },
        revpar: { value: 0, unit: 'USD', label: 'RevPAR' },
        revenue: { value: 0, unit: 'USD', label: 'Total Revenue', change: 0 },
        complaintResolution: { value: 0, unit: '%', label: 'Complaint Resolution Rate' },
        occupiedRooms: { value: 0, unit: 'rooms', label: 'Occupied Rooms' },
        totalRooms: { value: 0, unit: 'rooms', label: 'Total Rooms' },
      },
    };
  }

  async forecastOccupancy(ctx: CallerCtx, days = 30) {
    if (ctx.tenantId !== null) {
      return { historical: [], forecast: [], model: { slope: 0, intercept: 0 },
        _note: 'Tenant-scoped forecasting requires row-level isolation (upcoming schema migration).' };
    }

    const histResult = await db.execute(
      sql`SELECT date_trunc('day', check_in_date)::date::text as date, count(*)::int as bookings
          FROM reservations
          WHERE check_in_date >= NOW() - INTERVAL '90 days'
          GROUP BY 1 ORDER BY 1`
    );
    const histRows = rows(histResult) as { date: string; bookings: number }[];
    const points = histRows.map((r, i) => ({ x: i, y: Number(r.bookings) }));
    const { slope, intercept } = linearRegression(points);

    const forecast: { date: string; predicted: number; confidence: number }[] = [];
    for (let i = 0; i < days; i++) {
      const xVal = histRows.length + i;
      const predicted = Math.max(0, Math.round(slope * xVal + intercept));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);
      forecast.push({ date: futureDate.toISOString().split('T')[0], predicted, confidence: Math.max(60, 95 - i * 0.5) });
    }
    return { historical: histRows, forecast, model: { slope: parseFloat(slope.toFixed(3)), intercept: parseFloat(intercept.toFixed(3)) } };
  }

  async forecastRevenue(ctx: CallerCtx, days = 30) {
    if (ctx.tenantId !== null) {
      return { historical: [], forecast: [], model: { slope: 0, intercept: 0 },
        _note: 'Tenant-scoped forecasting requires row-level isolation (upcoming schema migration).' };
    }

    const histResult = await db.execute(
      sql`SELECT date_trunc('day', created_at)::date::text as date, COALESCE(SUM(amount), 0)::numeric as revenue
          FROM payments
          WHERE created_at >= NOW() - INTERVAL '90 days'
          GROUP BY 1 ORDER BY 1`
    );
    const histRows = rows(histResult) as { date: string; revenue: string }[];
    const points = histRows.map((r, i) => ({ x: i, y: parseFloat(r.revenue) }));
    const { slope, intercept } = linearRegression(points);

    const forecast: { date: string; predicted: number; confidence: number }[] = [];
    for (let i = 0; i < days; i++) {
      const xVal = histRows.length + i;
      const predicted = Math.max(0, parseFloat((slope * xVal + intercept).toFixed(2)));
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);
      forecast.push({ date: futureDate.toISOString().split('T')[0], predicted, confidence: Math.max(55, 90 - i * 0.6) });
    }
    return { historical: histRows, forecast, model: { slope: parseFloat(slope.toFixed(3)), intercept: parseFloat(intercept.toFixed(3)) } };
  }

  async drillDown(ctx: CallerCtx, metric: 'occupancy' | 'revenue', groupBy: 'branch' | 'category' = 'branch') {
    if (ctx.tenantId !== null) {
      return { metric, groupBy, data: [],
        _note: 'Tenant-scoped drill-down requires row-level isolation (upcoming schema migration).' };
    }

    if (metric === 'revenue') {
      const result = await db.execute(
        sql`SELECT 'All' as group_name, COALESCE(SUM(amount), 0)::numeric as value, count(*)::int as count
            FROM payments WHERE created_at >= NOW() - INTERVAL '30 days'`
      );
      return { metric, groupBy, data: rows(result) };
    }
    const result = await db.execute(
      sql`SELECT status as group_name, count(*)::int as count, count(*)::int as value FROM rooms GROUP BY status ORDER BY count DESC`
    );
    return { metric, groupBy, data: rows(result) };
  }
}
