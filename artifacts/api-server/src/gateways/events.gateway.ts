import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { MetricsService } from '../modules/metrics/metrics.service';
import { requireSessionSecret } from '../common/config/runtime-secrets';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connections = 0;

  constructor(
    private readonly jwtService: JwtService,
    private readonly metrics: MetricsService,
  ) {}

  /** Authenticate the socket handshake via JWT. Returns tenantId or null (platform admin). */
  private authenticateSocket(client: Socket): { userId: string; tenantId: string | null } | null {
    try {
      const token =
        (client.handshake.auth?.token as string) ??
        (client.handshake.query?.token as string);
      if (!token) return null;
      const secret = requireSessionSecret();
      const payload = this.jwtService.verify<{ userId: string; tenantId: string | null }>(token, { secret });
      return { userId: payload.userId, tenantId: payload.tenantId ?? null };
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const identity = this.authenticateSocket(client);
    if (!identity) {
      client.emit('auth_error', { message: 'Missing or invalid JWT. Provide token in handshake.auth.token.' });
      client.disconnect(true);
      // Do NOT increment — rejected connections are never counted
      return;
    }
    // Store identity on socket for use in subscription handlers
    (client as any).__tenantId = identity.tenantId;
    (client as any).__userId = identity.userId;
    // Mark as authenticated so handleDisconnect can safely decrement
    (client as any).__authenticated = true;
    this.connections++;
    this.metrics.setGauge('websocket_connections_active', this.connections);
  }

  handleDisconnect(client: Socket) {
    // Only decrement for connections that were fully authenticated (counted in this.connections)
    if ((client as any).__authenticated) {
      this.connections = Math.max(0, this.connections - 1);
      this.metrics.setGauge('websocket_connections_active', this.connections);
    }
  }

  /** Tenant-scoped room name: platform admins use 'platform:<channel>', tenants use 'tenant:<id>:<channel>' */
  private roomName(tenantId: string | null, channel: string): string {
    return tenantId ? `tenant:${tenantId}:${channel}` : `platform:${channel}`;
  }

  @SubscribeMessage('subscribe-reservations')
  subscribeReservations(@ConnectedSocket() client: Socket) {
    const tenantId = (client as any).__tenantId ?? null;
    const room = this.roomName(tenantId, 'reservations');
    client.join(room);
    return { ok: true, channel: 'reservations', room };
  }

  @SubscribeMessage('subscribe-rooms')
  subscribeRooms(@ConnectedSocket() client: Socket) {
    const tenantId = (client as any).__tenantId ?? null;
    const room = this.roomName(tenantId, 'rooms');
    client.join(room);
    return { ok: true, channel: 'rooms', room };
  }

  @SubscribeMessage('subscribe-housekeeping')
  subscribeHousekeeping(@ConnectedSocket() client: Socket) {
    const tenantId = (client as any).__tenantId ?? null;
    const room = this.roomName(tenantId, 'housekeeping');
    client.join(room);
    return { ok: true, channel: 'housekeeping', room };
  }

  @SubscribeMessage('subscribe-notifications')
  subscribeNotifications(@ConnectedSocket() client: Socket) {
    const tenantId = (client as any).__tenantId ?? null;
    const room = this.roomName(tenantId, 'notifications');
    client.join(room);
    return { ok: true, channel: 'notifications', room };
  }

  @SubscribeMessage('subscribe-dashboard')
  subscribeDashboard(@ConnectedSocket() client: Socket) {
    const tenantId = (client as any).__tenantId ?? null;
    const room = this.roomName(tenantId, 'dashboard');
    client.join(room);
    return { ok: true, channel: 'dashboard', room };
  }

  /** Broadcast to both platform admins and the specific tenant room */
  private broadcastToTenant(channel: string, event: string, payload: any, tenantId?: string | null) {
    // Platform admin room always receives events
    this.server.to(`platform:${channel}`).emit(event, payload);
    // Also send to the specific tenant's room if known
    if (tenantId) {
      this.server.to(`tenant:${tenantId}:${channel}`).emit(event, payload);
    }
  }

  @OnEvent('reservation.*')
  onReservationEvent(payload: any) {
    this.broadcastToTenant('reservations', 'reservation:update', payload, payload?.tenantId);
    this.broadcastToTenant('dashboard', 'dashboard:update', { type: 'reservation', payload }, payload?.tenantId);
  }

  @OnEvent('room.*')
  onRoomEvent(payload: any) {
    this.broadcastToTenant('rooms', 'room:update', payload, payload?.tenantId);
    this.broadcastToTenant('dashboard', 'dashboard:update', { type: 'room', payload }, payload?.tenantId);
  }

  @OnEvent('housekeeping.*')
  onHousekeepingEvent(payload: any) {
    this.broadcastToTenant('housekeeping', 'housekeeping:update', payload, payload?.tenantId);
  }

  @OnEvent('notification.*')
  onNotificationEvent(payload: any) {
    this.broadcastToTenant('notifications', 'notification:push', payload, payload?.tenantId);
  }

  getConnectionCount(): number { return this.connections; }
}
