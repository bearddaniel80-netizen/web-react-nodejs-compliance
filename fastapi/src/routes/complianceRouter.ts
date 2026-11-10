import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import { verifyInternalKey } from "../security/apiKeyCheck";
import { ProcessRequest } from "../services/processRequest";

// Express 4 does not catch rejected promises, so forward them to the error handler.
export const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

export function apiRouter(folder: string): Router {
  const router = Router();
  const process = new ProcessRequest();

  const run = (filename: string, ...extra: string[]) => ["compliance", folder, "run", filename, ...extra];

  router.get("/list", wrap(async (req, res) => {
    verifyInternalKey(req);
    const results = await process.runQuery(["compliance", folder, "list"]);
    res.json({ result: results.split(/\n+/).filter(Boolean) });
  }));

  // ---------- Format ----------

  router.get("/github/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.type("html").send(await process.renderGithub(run(req.params.filename, "--format", "github")));
  }));

  router.get("/html/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.type("html").send(await process.renderHtml(run(req.params.filename, "--format", "html")));
  }));

  router.get("/markdown/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.type("html").send(await process.renderMarkdown(run(req.params.filename, "--format", "md")));
  }));

  router.get("/pdf/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.type("html").send(await process.renderPdf(run(req.params.filename, "--format", "pdf")));
  }));

  // ---------- Features ----------

  router.get("/cache/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    await process.runQuery(run(req.params.filename));
    res.json(await process.renderJson(run(req.params.filename, "--cache", "--format", "json")));
  }));

  router.get("/failfast/query/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.json(await process.renderJson(run(req.params.filename, "--fail-fast-query", "--format", "json")));
  }));

  router.get("/failfast/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.json(await process.renderJson(run(req.params.filename, "--fail-fast", "--format", "json")));
  }));

  router.get("/profile/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.json(await process.renderJson(run(req.params.filename, "--profile", "--format", "json")));
  }));

  router.get("/retry/:times/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.json(await process.renderJson(run(req.params.filename, "--retry", req.params.times, "--format", "json")));
  }));

  // Must stay last: catch-all single-segment route
  router.get("/:filename", wrap(async (req, res) => {
    verifyInternalKey(req);
    res.json(await process.renderJson(run(req.params.filename, "--format", "json")));
  }));

  return router;
}
