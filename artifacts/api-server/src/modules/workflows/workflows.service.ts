import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, desc, and, isNull, getTableColumns } from 'drizzle-orm';
import {
  db,
  workflowDefinitionsTable,
  workflowStepsTable,
  workflowInstancesTable,
  workflowApprovalsTable,
} from '@workspace/db';
import { CallerCtx, assertTenantAccess, isPlatformAdmin } from '../../common/context/tenant-context';

@Injectable()
export class WorkflowsService {
  // ─── Definitions ──────────────────────────────────────────────────────────
  async findAllDefinitions(ctx: CallerCtx) {
    const where = isPlatformAdmin(ctx)
      ? undefined
      : eq(workflowDefinitionsTable.tenantId, ctx.tenantId!);

    const rows = await db
      .select(getTableColumns(workflowDefinitionsTable))
      .from(workflowDefinitionsTable)
      .where(where)
      .orderBy(desc(workflowDefinitionsTable.createdAt));

    return Promise.all(
      rows.map(async (def) => {
        const steps = await db
          .select(getTableColumns(workflowStepsTable))
          .from(workflowStepsTable)
          .where(eq(workflowStepsTable.workflowId, def.id))
          .orderBy(workflowStepsTable.stepOrder);
        return { ...def, steps };
      }),
    );
  }

  async findOneDefinition(ctx: CallerCtx, id: string) {
    const [def] = await db
      .select(getTableColumns(workflowDefinitionsTable))
      .from(workflowDefinitionsTable)
      .where(eq(workflowDefinitionsTable.id, id));
    if (!def) throw new NotFoundException(`Workflow ${id} not found`);
    assertTenantAccess(ctx, def.tenantId);

    const steps = await db
      .select(getTableColumns(workflowStepsTable))
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflowId, id))
      .orderBy(workflowStepsTable.stepOrder);
    return { ...def, steps };
  }

  async createDefinition(ctx: CallerCtx, body: {
    name: string; code: string; description?: string; entityType: string;
    triggerConditions?: any; createdBy?: string;
  }) {
    const tenantId = ctx.tenantId ?? null;
    const [def] = await db.insert(workflowDefinitionsTable).values({
      name: body.name,
      code: body.code,
      description: body.description ?? null,
      entityType: body.entityType,
      tenantId,
      triggerConditions: body.triggerConditions ?? {},
      createdBy: ctx.userId,
    }).returning();
    return { ...def, steps: [] };
  }

  async updateDefinition(ctx: CallerCtx, id: string, body: Partial<{ name: string; description: string; isActive: boolean; triggerConditions: any }>) {
    await this.findOneDefinition(ctx, id); // asserts tenant access
    const [updated] = await db.update(workflowDefinitionsTable).set(body as any).where(eq(workflowDefinitionsTable.id, id)).returning();
    return updated;
  }

  async addStep(ctx: CallerCtx, workflowId: string, body: {
    stepOrder: number; name: string; description?: string;
    approverRole?: string; approverUserId?: string; action?: string;
    conditions?: any; escalationHours?: number; isOptional?: boolean;
  }) {
    await this.findOneDefinition(ctx, workflowId); // asserts tenant access
    const [step] = await db.insert(workflowStepsTable).values({
      workflowId,
      stepOrder: body.stepOrder,
      name: body.name,
      description: body.description ?? null,
      approverRole: body.approverRole ?? null,
      approverUserId: body.approverUserId ?? null,
      action: body.action ?? 'approve',
      conditions: body.conditions ?? {},
      escalationHours: body.escalationHours ?? 48,
      isOptional: body.isOptional ?? false,
    }).returning();
    return step;
  }

  async deleteStep(ctx: CallerCtx, stepId: string) {
    const [step] = await db.select(getTableColumns(workflowStepsTable)).from(workflowStepsTable).where(eq(workflowStepsTable.id, stepId));
    if (!step) throw new NotFoundException(`Step ${stepId} not found`);
    // Verify caller can access this workflow's tenant
    await this.findOneDefinition(ctx, step.workflowId);
    const [deleted] = await db.delete(workflowStepsTable).where(eq(workflowStepsTable.id, stepId)).returning();
    return deleted;
  }

  // ─── Instances ────────────────────────────────────────────────────────────
  async findAllInstances(ctx: CallerCtx, q: { status?: string; entityType?: string } = {}) {
    const conds: any[] = [];
    // Scope to caller's tenant unless platform admin
    if (!isPlatformAdmin(ctx) && ctx.tenantId) {
      conds.push(eq(workflowInstancesTable.tenantId, ctx.tenantId));
    }
    if (q.status) conds.push(eq(workflowInstancesTable.status, q.status));
    if (q.entityType) conds.push(eq(workflowInstancesTable.entityType, q.entityType));

    const where = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : and(...conds);
    const rows = await db
      .select(getTableColumns(workflowInstancesTable))
      .from(workflowInstancesTable)
      .where(where)
      .orderBy(desc(workflowInstancesTable.createdAt));

    return Promise.all(
      rows.map(async (inst) => {
        const approvals = await db
          .select(getTableColumns(workflowApprovalsTable))
          .from(workflowApprovalsTable)
          .where(eq(workflowApprovalsTable.instanceId, inst.id))
          .orderBy(workflowApprovalsTable.createdAt);
        return { ...inst, approvals };
      }),
    );
  }

  async startInstance(ctx: CallerCtx, body: {
    workflowId: string; entityType: string; entityId: string;
    entityLabel?: string; notes?: string;
  }) {
    const def = await this.findOneDefinition(ctx, body.workflowId); // asserts tenant access
    if (!def.steps || def.steps.length === 0) {
      throw new BadRequestException('Workflow has no steps — cannot start an instance');
    }
    const tenantId = ctx.tenantId ?? null;
    const [instance] = await db.insert(workflowInstancesTable).values({
      workflowId: body.workflowId,
      tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      entityLabel: body.entityLabel ?? null,
      status: 'in_progress',
      currentStep: 0,
      totalSteps: def.steps.length,
      startedBy: ctx.userId,
      notes: body.notes ?? null,
    }).returning();

    // Create approval record for the first step
    const firstStep = def.steps[0];
    await db.insert(workflowApprovalsTable).values({
      instanceId: instance.id,
      stepId: firstStep.id,
      stepName: firstStep.name,
      dueAt: new Date(Date.now() + (firstStep.escalationHours ?? 48) * 3600000),
    });
    return instance;
  }

  async advanceInstance(ctx: CallerCtx, instanceId: string, body: {
    action: 'approved' | 'rejected'; comments?: string;
  }) {
    const [instance] = await db
      .select(getTableColumns(workflowInstancesTable))
      .from(workflowInstancesTable)
      .where(eq(workflowInstancesTable.id, instanceId));
    if (!instance) throw new NotFoundException(`Instance ${instanceId} not found`);
    assertTenantAccess(ctx, instance.tenantId);

    if (instance.status === 'approved' || instance.status === 'rejected') {
      throw new BadRequestException('Workflow instance is already completed');
    }

    // Find the single open approval for this instance
    const openApprovals = await db
      .select(getTableColumns(workflowApprovalsTable))
      .from(workflowApprovalsTable)
      .where(and(eq(workflowApprovalsTable.instanceId, instanceId), isNull(workflowApprovalsTable.action)));

    if (openApprovals.length === 0) {
      throw new BadRequestException('No open approval found for this instance — it may have already been acted on');
    }

    const openApproval = openApprovals[0];

    // Check approver role authorization (loose check — platform admins always pass)
    if (!isPlatformAdmin(ctx)) {
      const step = await db
        .select(getTableColumns(workflowStepsTable))
        .from(workflowStepsTable)
        .where(eq(workflowStepsTable.id, openApproval.stepId));
      const currentStep = step[0];
      if (currentStep?.approverRole && currentStep.approverRole !== ctx.roleName) {
        throw new ForbiddenException(`This approval step requires role: ${currentStep.approverRole}`);
      }
    }

    // Atomically record the approval action on exactly this one open approval
    await db.update(workflowApprovalsTable).set({
      action: body.action,
      approverId: ctx.userId,
      approverName: ctx.roleName,
      comments: body.comments ?? null,
      actedAt: new Date(),
    }).where(eq(workflowApprovalsTable.id, openApproval.id));

    if (body.action === 'rejected') {
      await db.update(workflowInstancesTable)
        .set({ status: 'rejected', completedAt: new Date() })
        .where(eq(workflowInstancesTable.id, instanceId));
      return { status: 'rejected' };
    }

    // Move to next step
    const def = await this.findOneDefinition(ctx, instance.workflowId);
    const nextStep = instance.currentStep + 1;

    if (nextStep >= def.steps.length) {
      await db.update(workflowInstancesTable).set({
        status: 'approved', currentStep: nextStep, completedAt: new Date(),
      }).where(eq(workflowInstancesTable.id, instanceId));
      return { status: 'approved' };
    }

    await db.update(workflowInstancesTable)
      .set({ currentStep: nextStep })
      .where(eq(workflowInstancesTable.id, instanceId));
    const step = def.steps[nextStep];
    await db.insert(workflowApprovalsTable).values({
      instanceId,
      stepId: step.id,
      stepName: step.name,
      dueAt: new Date(Date.now() + (step.escalationHours ?? 48) * 3600000),
    });

    return { status: 'in_progress', currentStep: nextStep, stepName: step.name };
  }
}
