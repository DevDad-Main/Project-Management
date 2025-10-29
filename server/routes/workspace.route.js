import express from "express";
import {
  getUserWorkspaces,
  addMemberToWorkspace,
} from "../controllers/workspace.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = express.Router();

router.get("/", authMiddleware, getUserWorkspaces);
router.post("/add-member", authMiddleware, addMemberToWorkspace);

export default router;
