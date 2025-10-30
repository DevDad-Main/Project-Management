import express from "express";
import cors from "cors";
import "dotenv/config";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from "./routes/workspace.route.js";
import projectRouter from "./routes/project.route.js";
import taskRouter from "./routes/task.route.js";
import commentRouter from "./routes/comment.route.js";

//#region Constants
const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = process.env.CORS_ORIGIN.split(",");
//#endregion

//#region Middleware
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["PATCH", "POST", "PUT", "GET", "DELETE", "OPTIONS"],
    allowedHeaders: [
      // Indicates the media type of the resource (e.g., application/json, text/html).
      "Content-Type",

      // Used to pass authentication credentials such as JWTs, API keys, or OAuth tokens.
      "Authorization",

      // Commonly used by AJAX requests (e.g., XMLHttpRequest) to identify them as being made via JavaScript.
      "X-Requested-With",

      // Custom header often used to persist device sessions or remember a user across requests.
      "device-remember-token",

      // Lists the HTTP headers that are permitted in requests; usually handled by the server,
      // but sometimes included here for compatibility.
      "Access-Control-Allow-Headers",

      // Identifies where the request originated (scheme, host, port) — used by CORS for validation.
      "Origin",

      // Tells the server which content types the client is willing to accept in the response (e.g., JSON, XML).
      "Accept",
    ],
    credentials: true,
    // optionsSuccessStatus: 200,
  }),
);
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

app.use("/api/workspaces", workspaceRouter);
app.use("/api/projects", projectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/comments/", commentRouter);
//#endregion

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
