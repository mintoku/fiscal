import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import { getUserId, json, parseJsonBody } from "../lib/http";

const s3 = new S3Client({});

type PresignBody = {
  fileName?: string;
  contentType?: string;
};

function bucketName(): string {
  const name = process.env.BUCKET_NAME;
  if (!name) throw new Error("BUCKET_NAME is not set");
  return name;
}

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  const body = parseJsonBody<PresignBody>(event);
  const fileName = body?.fileName?.trim();
  if (!fileName || !fileName.toLowerCase().endsWith(".csv")) {
    return json(400, { error: "fileName must be a .csv file" });
  }

  const userId = getUserId(event);
  const uploadId = randomUUID();
  const safeName = fileName.replace(/[^\w.\-]+/g, "_");
  const key = `uploads/${userId}/${uploadId}/${safeName}`;
  const contentType = body?.contentType?.trim() || "text/csv";

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 5 },
  );

  return json(200, {
    uploadUrl,
    key,
    uploadId,
    headers: { "Content-Type": contentType },
  });
};
