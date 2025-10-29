import express from "express";
import cors from "cors";
import "dotenv/config";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";
import { inngest, functions } from "./inngest";

//#region Constants
const app = express();
const PORT = process.env.PORT || 3000;
//#endregion

//#region Middleware
app.use(cors());
app.use(clerkMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//NOTE: Inngest Endpoint so it can listen to our events and webhooks and fire them off.
app.use("/api/inngest", serve({ client: inngest, functions }));
//#endregion

//#region Route Endpoints
app.get("/", (_, res) => {
  res.send("Server is live!");
});
//#endregion

app.listen(PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
