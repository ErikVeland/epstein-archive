import { getApiPool } from '../db/connection.js';

export interface InvestigationTask {
  id: number;
  uuid: string;
  investigationId: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number; // 0-100 percentage
}

export interface CreateInvestigationTaskInput {
  investigationId: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
}

export interface UpdateInvestigationTaskInput {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number;
}

export interface TaskFilter {
  investigationId?: number;
  status?: string;
  priority?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

interface TaskRow {
  id: number;
  uuid: string;
  investigation_id: number;
  title: string;
  description: string | null;
  status: InvestigationTask['status'];
  priority: InvestigationTask['priority'];
  assigned_to: string | null;
  due_date: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  evidence_ids: string | null;
  related_entities: string | null;
  progress: number | null;
}

export class InvestigativeTaskService {
  async getTasks(filters: TaskFilter = {}): Promise<{
    data: InvestigationTask[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const pool = getApiPool();
    const { investigationId, status, priority, assignedTo, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: (string | number)[] = [];
    let paramCounter = 1;

    if (investigationId) {
      where.push(`investigation_id = $${paramCounter++}`);
      params.push(investigationId);
    }
    if (status) {
      where.push(`status = $${paramCounter++}`);
      params.push(status);
    }
    if (priority) {
      where.push(`priority = $${paramCounter++}`);
      params.push(priority);
    }
    if (assignedTo) {
      where.push(`assigned_to = $${paramCounter++}`);
      params.push(assignedTo);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks
      ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM investigation_tasks ${whereClause}`;

    const { rows: tasks } = await pool.query(query, [...params, limit, offset]);
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = parseInt(countRows[0].total, 10);

    return {
      data: tasks.map((task) => this.mapTask(task)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTaskById(id: number): Promise<InvestigationTask | null> {
    const pool = getApiPool();
    const { rows } = await pool.query(
      `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks WHERE id = $1
    `,
      [id],
    );

    const task = rows[0];
    if (!task) return null;

    return this.mapTask(task);
  }

  async createTask(data: CreateInvestigationTaskInput): Promise<InvestigationTask> {
    const pool = getApiPool();
    // Generate UUID using crypto.randomUUID() if available, otherwise use a simple implementation
    let uuidValue: string;
    if (
      typeof crypto !== 'undefined' &&
      typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
    ) {
      uuidValue = (crypto as { randomUUID: () => string }).randomUUID();
    } else {
      // Simple UUID generation for environments without crypto
      uuidValue = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO investigation_tasks (
        uuid, investigation_id, title, description, priority, assigned_to, 
        due_date, created_by_id, evidence_ids, related_entities
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING id
    `,
      [
        uuidValue,
        data.investigationId,
        data.title,
        data.description || null,
        data.priority || 'medium',
        data.assignedTo || null,
        data.dueDate || null,
        data.createdById,
        data.evidenceIds ? JSON.stringify(data.evidenceIds) : null,
        data.relatedEntities ? JSON.stringify(data.relatedEntities) : null,
      ],
    );

    const task = await this.getTaskById(rows[0].id);
    if (!task) {
      throw new Error('Failed to create task');
    }

    return task;
  }

  async updateTask(
    id: number,
    updates: UpdateInvestigationTaskInput,
  ): Promise<InvestigationTask | null> {
    const pool = getApiPool();
    const fields: string[] = [];
    const params: (string | number | null)[] = [];
    let paramCounter = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramCounter++}`);
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCounter++}`);
      params.push(updates.description);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCounter++}`);
      params.push(updates.status);
      if (updates.status === 'completed') {
        fields.push(`completed_at = $${paramCounter++}`);
        params.push(new Date().toISOString());
      }
    }
    if (updates.priority !== undefined) {
      fields.push(`priority = $${paramCounter++}`);
      params.push(updates.priority);
    }
    if (updates.assignedTo !== undefined) {
      fields.push(`assigned_to = $${paramCounter++}`);
      params.push(updates.assignedTo);
    }
    if (updates.dueDate !== undefined) {
      fields.push(`due_date = $${paramCounter++}`);
      params.push(updates.dueDate);
    }
    if (updates.evidenceIds !== undefined) {
      fields.push(`evidence_ids = $${paramCounter++}`);
      params.push(JSON.stringify(updates.evidenceIds));
    }
    if (updates.relatedEntities !== undefined) {
      fields.push(`related_entities = $${paramCounter++}`);
      params.push(JSON.stringify(updates.relatedEntities));
    }
    if (updates.progress !== undefined) {
      fields.push(`progress = $${paramCounter++}`);
      params.push(updates.progress);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 1) {
      // Only updated_at
      return this.getTaskById(id);
    }

    const query = `
      UPDATE investigation_tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramCounter++}
    `;

    await pool.query(query, [...params, id]);

    return this.getTaskById(id);
  }

  async deleteTask(id: number): Promise<boolean> {
    const pool = getApiPool();
    const { rowCount } = await pool.query('DELETE FROM investigation_tasks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async getTasksByInvestigation(investigationId: number): Promise<InvestigationTask[]> {
    const pool = getApiPool();
    const { rows: tasks } = await pool.query(
      `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks 
      WHERE investigation_id = $1
      ORDER BY priority DESC, created_at DESC
    `,
      [investigationId],
    );

    return tasks.map((task) => this.mapTask(task));
  }

  async getTaskSummary(investigationId: number): Promise<{
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
    overdueTasks: number;
    averageProgress: number;
    assignmentBreakdown: { assignedTo: string; count: number }[];
  }> {
    const pool = getApiPool();

    // Get task counts by status
    const { rows: statusCounts } = await pool.query(
      `
      SELECT status, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = $1
      GROUP BY status
    `,
      [investigationId],
    );

    // Get task counts by priority
    const { rows: priorityCounts } = await pool.query(
      `
      SELECT priority, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = $1
      GROUP BY priority
    `,
      [investigationId],
    );

    // Get overdue tasks
    const { rows: overdueTasksRows } = await pool.query(
      `
      SELECT COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = $1
        AND due_date < CURRENT_DATE
        AND status != 'completed'
    `,
      [investigationId],
    );
    const overdueTasks = overdueTasksRows[0];

    // Get average progress
    const { rows: avgProgressRows } = await pool.query(
      `
      SELECT AVG(progress) as "avgProgress"
      FROM investigation_tasks
      WHERE investigation_id = $1
        AND progress IS NOT NULL
    `,
      [investigationId],
    );
    const avgProgress = avgProgressRows[0];

    // Get tasks assigned to each user
    const { rows: assignmentCounts } = await pool.query(
      `
      SELECT assigned_to, COUNT(*) as count
      FROM investigation_tasks
      WHERE investigation_id = $1
        AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    `,
      [investigationId],
    );

    interface StatusCountRow {
      status: string;
      count: string;
    }
    interface PriorityCountRow {
      priority: string;
      count: string;
    }
    interface OverdueRow {
      count: string;
    }
    interface AvgProgressRow {
      avgProgress: string | null;
    }
    interface AssignmentRow {
      assigned_to: string;
      count: string;
    }

    return {
      statusBreakdown: (statusCounts as StatusCountRow[]).reduce(
        (acc, curr) => {
          acc[curr.status] = parseInt(curr.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      ),
      priorityBreakdown: (priorityCounts as PriorityCountRow[]).reduce(
        (acc, curr) => {
          acc[curr.priority] = parseInt(curr.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      ),
      overdueTasks: parseInt((overdueTasks as OverdueRow).count, 10),
      averageProgress: (avgProgress as AvgProgressRow).avgProgress
        ? Math.round(parseFloat((avgProgress as AvgProgressRow).avgProgress!))
        : 0,
      assignmentBreakdown: (assignmentCounts as AssignmentRow[]).map((row) => ({
        assignedTo: row.assigned_to,
        count: parseInt(row.count, 10),
      })),
    };
  }

  async updateTaskProgress(taskId: number, progress: number): Promise<InvestigationTask | null> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const pool = getApiPool();
    const { rowCount } = await pool.query(
      `
      UPDATE investigation_tasks 
      SET progress = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [progress, taskId],
    );

    if ((rowCount ?? 0) === 0) {
      return null;
    }

    return this.getTaskById(taskId);
  }

  async getUrgentTasks(userId?: string): Promise<InvestigationTask[]> {
    const pool = getApiPool();

    let query = `
      SELECT id, uuid, investigation_id, title, description, status, priority, 
             assigned_to, due_date, created_by_id, created_at, updated_at, completed_at,
             evidence_ids, related_entities, progress
      FROM investigation_tasks
      WHERE status != 'completed'
        AND (
          (priority = 'critical' AND due_date <= CURRENT_DATE + interval '3 days') OR
          (priority = 'high' AND due_date <= CURRENT_DATE + interval '7 days') OR
          (due_date <= CURRENT_DATE AND status != 'completed')
        )
    `;

    const params: string[] = [];
    if (userId) {
      query += ` AND assigned_to = $1`;
      params.push(userId);
    }

    query += ` ORDER BY priority DESC, due_date ASC LIMIT 20`;

    const { rows: tasks } = await pool.query(query, params);
    return tasks.map((task) => this.mapTask(task));
  }

  private mapTask(row: TaskRow): InvestigationTask {
    return {
      id: row.id,
      uuid: row.uuid,
      investigationId: row.investigation_id,
      title: row.title,
      description: row.description ?? undefined,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to ?? undefined,
      dueDate: row.due_date ?? undefined,
      createdById: row.created_by_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at ?? undefined,
      evidenceIds: row.evidence_ids ? JSON.parse(row.evidence_ids) : [],
      relatedEntities: row.related_entities ? JSON.parse(row.related_entities) : [],
      progress: row.progress || 0,
    };
  }
}
