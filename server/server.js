import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (_, res) => {
  res.send("Server is live!");
});

app.listen(PORT || 3000, () => {
  console.log(`Server is running on port ${PORT}`);
});
