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
import http from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import morgan from "morgan";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import { emailQueue } from "./queues/emailQueue.js";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { bullmqConnection } from "./configs/bullmq.js";
// import xss from "xss"; // TODO: Fix Import

//#region Constants
const app = express();
const PORT = process.env.PORT || 3000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
const allowedOrigins = process.env.CORS_ORIGIN.split(",");
//#endregion

//#region Middleware
// Security Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  }),
);
app.use(clerkMiddleware());
app.use(helmet()); // Set security HTTP headers
// app.use(xss()); // Data sanitization against XSS
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use("/api", limiter); // Apply rate limiting to all routes

const env = process.env.NODE_ENV || "development"; // fallback
if (env === "development") {
  app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
app.use("/api/comments", commentRouter);
//#endregion

//#region Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    credentials: true,
  },
});

const onlineUsers = new Map();

io.on("connection", async (socket) => {
  const socketToken = socket.handshake.auth?.token;

  if (!socketToken) {
    console.log("Socket connection failed: No Token Provided");
    socket.disconnect();
    return;
  }
  // console.log(socketToken);

  try {
    const userId = socketToken.slice(0, 10);
    console.log(
      `Socket ID: ${socket.id} - User ID: ${socketToken.slice(0, 10)} just connected!`,
    );

    const userSet = onlineUsers.get(userId) ?? new Set();
    userSet.add(socket.id);
    onlineUsers.set(userId, userSet);

    // NOTE: Users now will be able to join rooms based on their userId and the task at hand.
    socket.on("join_task", (taskId) => {
      socket.join(`task_${taskId}`);
      console.log(`User ${userId} joined room task_${taskId}`);
    });

    socket.on("task:comment", ({ taskId, message }) => {
      io.to(`task_${taskId}`).emit("comment:new", {
        taskId,
        userId: socket.userId,
        message,
        createdAt: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userSet = onlineUsers.get(userId);
      if (userSet) {
        userSet.delete(socket.id);
        if (userSet.size === 0) onlineUsers.delete(userId);
        else onlineUsers.set(userId, userSet);
      }
    });
  } catch (error) {
    console.log(error);
    console.log("Socket connection rejected: invalid token");
    socket.disconnect();
  }
});

app.set("io", io);
//#endregion

//#region Bull Board

// NOTE: Create a server adapter for Bull Board - similiar to our test project
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// NOTE: Attach the queues to the dashboard
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

// NOTE: Mount the dashboard route
app.use("/admin/queues", serverAdapter.getRouter());

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Bull Board available at: http://localhost:${PORT}/admin/queues`);
});
