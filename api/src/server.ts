import express from "express";
import cors from "cors";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/sessions", sessionsRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
