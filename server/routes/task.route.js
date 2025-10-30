import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createTask,
  deleteTask,
  updateTask,
} from "../controllers/task.controller.js";

const router = express.Router();

router.post("/", requireAuth(), createTask);
router.post("/delete", requireAuth(), deleteTask);
router.put("/:id", requireAuth(), updateTask);

export default router;
