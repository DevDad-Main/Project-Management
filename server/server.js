import express from "express";
import cors from "cors";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(clerkMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res) => {
  res.send("Server is live!");
});

app.listen(PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
