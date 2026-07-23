import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getUserId, json } from "../lib/http";
import { clearTransactions } from "../lib/transactionsDb";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = getUserId(event);
  const deleted = await clearTransactions(userId);
  return json(200, { deleted });
};
