import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createComment,
  getTaskComments,
} from "../controllers/comment.controller.js";

const router = express.Router();

router.get("/:taskId", requireAuth(), getTaskComments);
router.post("/", requireAuth(), createComment);

export default router;
