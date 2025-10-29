import express from "express";
import {
  getUserWorkspaces,
  addMemberToWorkspace,
} from "../controllers/workspace.controller.js";
import authenticateUser from "../middleware/auth.middleware.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/", requireAuth(), getUserWorkspaces);
router.post("/add-member", requireAuth(), addMemberToWorkspace);

// // Customizing the sign-in path
// router.use(requireAuth({ signInUrl: "/" }));

export default router;
