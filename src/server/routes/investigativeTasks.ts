import express from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { InvestigativeTaskService } from '../services/InvestigativeTaskService.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';

const router = express.Router();
const taskService = new InvestigativeTaskService();

// Schemas
const getTasksSchema = z.object({
  query: z.object({
    investigationId: z.coerce.number().int().min(1).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assignedTo: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const taskIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
});

const createTaskSchema = z.object({
  body: z.object({
    investigationId: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    priority: z.string().optional(),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
    evidenceIds: z.array(z.number()).optional(),
    relatedEntities: z.array(z.number()).optional(),
  }),
});

const investigationIdParamSchema = z.object({
  params: z.object({
    investigationId: z.coerce.number().int().min(1),
  }),
});

const updateProgressSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    progress: z.number().min(0).max(100),
  }),
});

// Get all tasks with optional filters
router.get('/', validate(getTasksSchema), async (req, res, next) => {
  try {
    const filters = req.query as Record<string, string | undefined>;
    const page = Number(filters.page || 1);
    const limit = Number(filters.limit || 20);
    if (rejectDeepOffset(res, 'Task', page, limit)) return;

    const result = await taskService.getTasks(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get a specific task by ID
router.get('/:id', validate(taskIdParamSchema), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id as string);

    const task = await taskService.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create a new task
router.post('/', authenticateRequest, validate(createTaskSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const newTask = await taskService.createTask({
      investigationId: data.investigationId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      createdById: (req as { user?: { id?: string } }).user?.id || 'system',
      evidenceIds: data.evidenceIds,
      relatedEntities: data.relatedEntities,
    });

    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// Update a task
router.put('/:id', authenticateRequest, validate(taskIdParamSchema), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id as string);
    const updates = req.body;

    const updatedTask = await taskService.updateTask(taskId, updates);

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// Delete a task
router.delete(
  '/:id',
  authenticateRequest,
  requireRole('admin'),
  validate(taskIdParamSchema),
  async (req, res, next) => {
    try {
      const taskId = Number(req.params.id as string);

      const success = await taskService.deleteTask(taskId);

      if (!success) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// Get tasks by investigation
router.get(
  '/investigation/:investigationId',
  validate(investigationIdParamSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.investigationId as string);

      const tasks = await taskService.getTasksByInvestigation(id);
      res.json({ data: tasks, total: tasks.length });
    } catch (error) {
      next(error);
    }
  },
);

// Get task summary for an investigation
router.get(
  '/summary/:investigationId',
  validate(investigationIdParamSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.investigationId as string);

      const summary = await taskService.getTaskSummary(id);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  },
);

// Update task progress
router.patch(
  '/:id/progress',
  authenticateRequest,
  validate(updateProgressSchema),
  async (req, res, next) => {
    try {
      const taskId = Number(req.params.id as string);
      const { progress } = req.body;

      const updatedTask = await taskService.updateTaskProgress(taskId, progress);

      if (!updatedTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  },
);

// Get urgent tasks for the current user
// Get urgent tasks for the current user
router.get('/urgent/:userId?', async (req, res, next) => {
  try {
    const userId =
      (req.params.userId as string | undefined) || (req as { user?: { id?: string } }).user?.id;
    const tasks = await taskService.getUrgentTasks(userId);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

export default router;
