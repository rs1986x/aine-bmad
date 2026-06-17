import { Router } from 'express'

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

export default router
