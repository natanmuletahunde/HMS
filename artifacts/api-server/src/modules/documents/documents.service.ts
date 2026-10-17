import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { db, documentsTable } from '@workspace/db';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), '..', '..', 'uploads');

@Injectable()
export class DocumentsService {
  constructor() {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  async findAll(q: { referenceType?: string; referenceId?: string; documentType?: string; search?: string }) {
    const conds: any[] = [eq(documentsTable.isActive, true)];
    if (q.referenceType) conds.push(eq(documentsTable.referenceType, q.referenceType));
    if (q.referenceId) conds.push(eq(documentsTable.referenceId, q.referenceId));
    if (q.documentType) conds.push(eq(documentsTable.documentType, q.documentType as any));
    if (q.search) {
      const s = `%${q.search}%`;
      conds.push(like(documentsTable.name, s));
    }

    return db
      .select()
      .from(documentsTable)
      .where(and(...conds))
      .orderBy(desc(documentsTable.createdAt))
      .limit(200);
  }

  async findOne(id: string) {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async upload(
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    b: any,
  ) {
    const ext = extname(file.originalname);
    const filename = randomUUID() + ext;
    const filePath = join(UPLOAD_DIR, filename);
    writeFileSync(filePath, file.buffer);

    const [doc] = await db
      .insert(documentsTable)
      .values({
        name: b.name ?? file.originalname,
        originalName: file.originalname,
        documentType: (b.documentType ?? 'other') as any,
        mimeType: file.mimetype,
        size: file.size,
        storageType: 'local',
        storagePath: filename,
        publicUrl: b.publicUrl ?? null,
        referenceType: b.referenceType ?? null,
        referenceId: b.referenceId ?? null,
        description: b.description ?? null,
        tags: b.tags ?? null,
        isPublic: b.isPublic === true || b.isPublic === 'true',
        createdBy: b.createdBy ?? null,
      })
      .returning();
    return doc;
  }

  async remove(id: string) {
    const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
    if (!doc) throw new NotFoundException(`Document ${id} not found`);

    await db
      .update(documentsTable)
      .set({ isActive: false, deletedAt: new Date() })
      .where(eq(documentsTable.id, id));

    try {
      const filePath = join(UPLOAD_DIR, doc.storagePath);
      unlinkSync(filePath);
    } catch {
      // File may not exist, ignore
    }

    return { success: true };
  }

  async getByReference(referenceType: string, referenceId: string) {
    return db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.isActive, true),
          eq(documentsTable.referenceType, referenceType),
          eq(documentsTable.referenceId, referenceId),
        ),
      )
      .orderBy(desc(documentsTable.createdAt));
  }

  async update(id: string, b: { description?: string; tags?: string; isPublic?: boolean }) {
    const u: any = {};
    if (b.description !== undefined) u.description = b.description;
    if (b.tags !== undefined) u.tags = b.tags;
    if (b.isPublic !== undefined) u.isPublic = b.isPublic;

    const [doc] = await db.update(documentsTable).set(u).where(eq(documentsTable.id, id)).returning();
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }
}
