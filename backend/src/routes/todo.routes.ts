import { Router } from 'express'

import { ValidationError } from '../errors/AppError'
import { createTodoSchema, todoIdSchema, updateTodoSchema } from '../schemas/todo.schema'
import { todoService } from '../services/todo.service'

const router = Router()

router.get('/todos', async (_req, res, next) => {
  try {
    const todos = await todoService.list()
    res.status(200).json(todos)
  } catch (err) {
    next(err)
  }
})

router.post('/todos', async (req, res, next) => {
  try {
    // Convert a failed safeParse into a ValidationError — a raw ZodError is not
    // an AppError and would be mapped to a generic 500 by the error middleware.
    const parsed = createTodoSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Description must not be empty.')
    }
    const todo = await todoService.create(parsed.data)
    res.status(201).json(todo)
  } catch (err) {
    next(err)
  }
})

router.patch('/todos/:id', async (req, res, next) => {
  try {
    const parsedId = todoIdSchema.safeParse(req.params.id)
    if (!parsedId.success) {
      throw new ValidationError(parsedId.error.issues[0]?.message ?? 'Invalid Todo id.')
    }

    const parsedBody = updateTodoSchema.safeParse(req.body)
    if (!parsedBody.success) {
      throw new ValidationError(parsedBody.error.issues[0]?.message ?? 'Invalid Todo update.')
    }

    const todo = await todoService.update(parsedId.data, parsedBody.data)
    res.status(200).json(todo)
  } catch (err) {
    next(err)
  }
})

router.delete('/todos/:id', async (req, res, next) => {
  try {
    const parsedId = todoIdSchema.safeParse(req.params.id)
    if (!parsedId.success) {
      throw new ValidationError(parsedId.error.issues[0]?.message ?? 'Invalid Todo id.')
    }

    await todoService.remove(parsedId.data)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
