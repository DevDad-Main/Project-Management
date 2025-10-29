import {
  getUserWorkspaces,
  addMemberToWorkspace,
} from "../controllers/workspace.controller.js";
import express from "express";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/", requireAuth(), getUserWorkspaces);
router.post("/add-member", requireAuth(), addMemberToWorkspace);

// // Customizing the sign-in path
// router.use(requireAuth({ signInUrl: "/" }));

export default router;
