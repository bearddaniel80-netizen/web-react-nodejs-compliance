import { randomUUID } from "crypto";
import { Router } from "express";
import { Client } from "minio";
import { readSecret, verifyInternalKey } from "../security/apiKeyCheck";
import { wrap } from "./complianceRouter";

const MINIO_BUCKET = process.env.MINIO_BUCKET;
if (!MINIO_BUCKET) throw new Error("MINIO_BUCKET not set");

const minioClient = new Client({
  endPoint: "minio",
  port: 9000,
  useSSL: false,
  accessKey: readSecret("minio_app_user"),
  secretKey: readSecret("minio_app_password"),
});

export const minioRouter = Router();

// Generate presigned upload URL
minioRouter.post("/api/uploads", wrap(async (req, res) => {
  verifyInternalKey(req);

  const { content_type, filename } = req.body ?? {};
  if (typeof content_type !== "string" || typeof filename !== "string") {
    return res.status(422).json({ detail: "content_type and filename are required strings" });
  }

  const extension = filename.includes(".") ? "." + filename.split(".").pop() : "";
  const object_name = `${randomUUID()}${extension}`;

  const url = await minioClient.presignedPutObject(MINIO_BUCKET, object_name, 24 * 60 * 60);
  res.json({ object_name, url });
}));

// Generate download URL
minioRouter.get("/api/downloads/*", wrap(async (req, res) => {
  const objectName = (req.params as Record<string, string>)[0];
  const url = await minioClient.presignedGetObject(MINIO_BUCKET, objectName, 10 * 60);
  res.json({ url });
}));
