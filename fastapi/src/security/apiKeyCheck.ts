import fs from "fs";
import { Request } from "express";

export class ForbiddenError extends Error {}

export function readSecret(name: string): string {
  const path = `/run/secrets/${name}`;
  if (fs.existsSync(path)) {
    return fs.readFileSync(path, "utf-8").trim();
  }
  // Useful for local development outside Docker
  const value = process.env[name];
  if (value === undefined) throw new Error(`Missing secret or env var: ${name}`);
  return value;
}

const INTERNAL_API_KEY = readSecret("fastapi_internal_key");

export function verifyInternalKey(req: Request): void {
  if (req.header("x-internal-key") !== INTERNAL_API_KEY) {
    throw new ForbiddenError("Forbidden");
  }
}
