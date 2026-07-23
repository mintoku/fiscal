import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import { parseCsvFile } from "../../../../lib/parseCsv";
import { getUserId, json, parseJsonBody } from "../lib/http";
import { putTransactions } from "../lib/transactionsDb";

const s3 = new S3Client({});

type ProcessBody = {
  key?: string;
};

function bucketName(): string {
  const name = process.env.BUCKET_NAME;
  if (!name) throw new Error("BUCKET_NAME is not set");
  return name;
}

async function readObjectText(key: string): Promise<string> {
  const result = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName(),
      Key: key,
    }),
  );
  return (await result.Body?.transformToString("utf8")) ?? "";
}

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2,
) => {
  const body = parseJsonBody<ProcessBody>(event);
  const key = body?.key?.trim();
  if (!key) {
    return json(400, { error: "key is required" });
  }

  const userId = getUserId(event);
  const prefix = `uploads/${userId}/`;
  if (!key.startsWith(prefix)) {
    return json(403, { error: "Upload key does not belong to this user" });
  }

  const fileName = key.split("/").pop() ?? "upload.csv";
  const csvText = await readObjectText(key);
  const parsed = parseCsvFile(csvText, fileName);

  if (parsed.format === "unsupported") {
    return json(400, {
      error: "Unsupported CSV format",
      format: parsed.format,
      transactionCount: 0,
    });
  }

  await putTransactions(userId, parsed.transactions);

  return json(200, {
    format: parsed.format,
    transactionCount: parsed.transactions.length,
    key,
  });
};
