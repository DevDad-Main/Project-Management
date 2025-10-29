import express from "express";
import {
  getUserWorkspaces,
  addMemberToWorkspace,
} from "../controllers/workspace.controller.js";
import authenticateUser from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getUserWorkspaces);
router.post("/add-member", addMemberToWorkspace);

export default router;
