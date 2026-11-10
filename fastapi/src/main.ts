import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { ForbiddenError, verifyInternalKey } from "./security/apiKeyCheck";
import { apiRouter, wrap } from "./routes/complianceRouter";
import { minioRouter } from "./routes/minio";
import { ProcessRequest } from "./services/processRequest";
import fs from "fs/promises";
import path from "path";

const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

app.use(minioRouter);
app.use("/api/manifest", apiRouter("manifest"));
app.use("/api/suite", apiRouter("suite"));
app.use("/api/tag", apiRouter("tag"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/data", wrap(async (req, res) => {
  verifyInternalKey(req);
  res.json({ message: "Hello from Express" });
}));

app.get("/api/index", wrap(async (req, res) => {
  verifyInternalKey(req);
  const input = path.join(process.cwd(), "README.md");
  const output = path.join(process.cwd(), "README.html");
  await new ProcessRequest().runMarkdownConversion(input, output);
  res.type("html").send(await fs.readFile(output, "utf-8"));
}));

// Error handler: 403 {"detail":"Forbidden"} like FastAPI's HTTPException
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ detail: "Forbidden" });
  }
  console.error(err);
  res.status(500).json({ detail: err instanceof Error ? err.message : String(err) });
});

app.listen(8000, "0.0.0.0", () => console.log("Listening on :8000"));
