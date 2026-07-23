import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getUserId, json } from "../lib/http";
import { listTransactions } from "../lib/transactionsDb";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const userId = getUserId(event);
  const transactions = await listTransactions(userId);
  return json(200, { transactions, count: transactions.length });
};
