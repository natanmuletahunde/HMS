import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { MetricsInterceptor } from './modules/metrics/metrics.interceptor';
import { GlobalJwtAuthGuard } from './common/guards/global-jwt-auth.guard';
import { IpRestrictionGuard } from './common/guards/ip-restriction.guard';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
// Phase 2 Hotel Core
import { HotelModule } from './modules/hotel/hotel.module';
import { BranchesModule } from './modules/branches/branches.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { FloorsModule } from './modules/floors/floors.module';
import { RoomCategoriesModule } from './modules/room-categories/room-categories.module';
import { BedTypesModule } from './modules/bed-types/bed-types.module';
import { RoomAmenitiesModule } from './modules/room-amenities/room-amenities.module';
import { RoomPricingModule } from './modules/room-pricing/room-pricing.module';
// Existing
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
// Phase 3 Front Office
import { CheckinModule } from './modules/checkin/checkin.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { StayManagementModule } from './modules/stay-management/stay-management.module';
import { FrontOfficeModule } from './modules/front-office/front-office.module';
// Phase 4 Operations
import { PosModule } from './modules/pos/pos.module';
import { RoomServiceModule } from './modules/room-service/room-service.module';
// Phase 5 Business Management
import { ProcurementModule } from './modules/procurement/procurement.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ConferenceModule } from './modules/conference/conference.module';
import { TransportModule } from './modules/transport/transport.module';
import { HrModule } from './modules/hr/hr.module';
// Phase 6 Enterprise Services
import { CustomerServiceModule } from './modules/customer-service/customer-service.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
// Phase 7 SaaS Platform
import { TenantsModule } from './modules/tenants/tenants.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { ModuleConfigModule } from './modules/module-config/module-config.module';
import { PluginsModule } from './modules/plugins/plugins.module';
// Phase 7B Enterprise Platform Features
import { EventBusModule } from './modules/event-bus/event-bus.module';
import { AppCacheModule } from './modules/cache/cache.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { GatewayModule } from './gateways/gateway.module';
import { SecurityModule } from './modules/security/security.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { BiModule } from './modules/bi/bi.module';
import { GuestPortalModule } from './modules/guest-portal/guest-portal.module';

@Module({
  providers: [
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    // GlobalJwtAuthGuard runs FIRST: populates req.user for authenticated routes, passes public routes through
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
    // IpRestrictionGuard runs SECOND: uses req.user set above — no JWT re-verification needed
    { provide: APP_GUARD, useClass: IpRestrictionGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: process.env.RATE_LIMIT ? parseInt(process.env.RATE_LIMIT, 10) : 10000 }]),
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    HotelModule,
    BranchesModule,
    BuildingsModule,
    FloorsModule,
    RoomCategoriesModule,
    BedTypesModule,
    RoomAmenitiesModule,
    RoomPricingModule,
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    ReservationsModule,
    HousekeepingModule,
    MaintenanceModule,
    RestaurantModule,
    InventoryModule,
    InvoicesModule,
    PaymentsModule,
    EmployeesModule,
    DashboardModule,
    AuditLogsModule,
    NotificationsModule,
    // Phase 3 Front Office
    CheckinModule,
    CheckoutModule,
    StayManagementModule,
    FrontOfficeModule,
    // Phase 4 Operations
    PosModule,
    RoomServiceModule,
    // Phase 5 Business Management
    ProcurementModule,
    FinancialModule,
    ConferenceModule,
    TransportModule,
    HrModule,
    // Phase 6 Enterprise Services
    CustomerServiceModule,
    ReportsModule,
    SearchModule,
    DocumentsModule,
    SchedulerModule,
    // Phase 7 SaaS Platform
    TenantsModule,
    OrganizationsModule,
    SubscriptionsModule,
    WorkflowsModule,
    ModuleConfigModule,
    PluginsModule,
    // Phase 7B Enterprise Platform Features
    EventBusModule,
    AppCacheModule,
    MetricsModule,
    GatewayModule,
    SecurityModule,
    MobileModule,
    BiModule,
    GuestPortalModule,
  ],
})
export class AppModule {}
