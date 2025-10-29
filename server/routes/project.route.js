import express from "express";
import { requireAuth } from "@clerk/express";
import {
  addMemberToProject,
  createProject,
  updateProject,
} from "../controllers/project.controller.js";

const router = express.Router();

router.post("/", requireAuth(), createProject);
router.post("/:projectId/add-member", requireAuth(), addMemberToProject);
router.put("/", requireAuth(), updateProject);

export default router;
