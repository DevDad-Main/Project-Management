import express from "express";
import { requireAuth } from "@clerk/express";
import {
  addMemberToProject,
  createProject,
  removeMemberFromProject,
  updateProject,
} from "../controllers/project.controller.js";

const router = express.Router();

router.post("/", requireAuth(), createProject);
router.post("/:projectId/add-member", requireAuth(), addMemberToProject);
router.delete(
  "/:projectId/members/:memberId",
  requireAuth(),
  removeMemberFromProject,
);
router.put("/", requireAuth(), updateProject);

export default router;
