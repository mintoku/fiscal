import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  DeleteCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Transaction } from "../../../types/transaction";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME is not set");
  return name;
}

export function transactionPk(userId: string): string {
  return `USER#${userId}`;
}

export function transactionSk(transaction: Transaction): string {
  return `TXN#${transaction.date}#${transaction.id}`;
}

type TransactionItem = Transaction & {
  pk: string;
  sk: string;
  entityType: "transaction";
};

function toItem(userId: string, transaction: Transaction): TransactionItem {
  return {
    pk: transactionPk(userId),
    sk: transactionSk(transaction),
    entityType: "transaction",
    ...transaction,
  };
}

function fromItem(item: Record<string, unknown>): Transaction {
  return {
    id: String(item.id),
    date: String(item.date),
    description: String(item.description),
    amount: Number(item.amount),
    accountType: item.accountType as Transaction["accountType"],
    transactionType: item.transactionType as Transaction["transactionType"],
    sourceFile: String(item.sourceFile),
    category: (item.category as Transaction["category"]) ?? null,
    categorySource: (item.categorySource as Transaction["categorySource"]) ?? null,
    categoryConfidence:
      typeof item.categoryConfidence === "number"
        ? item.categoryConfidence
        : null,
  };
}

export async function putTransactions(
  userId: string,
  transactions: Transaction[],
): Promise<void> {
  const table = tableName();

  for (let i = 0; i < transactions.length; i += 25) {
    const chunk = transactions.slice(i, i + 25);
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: chunk.map((transaction) => ({
            PutRequest: { Item: toItem(userId, transaction) },
          })),
        },
      }),
    );
  }
}

export async function listTransactions(userId: string): Promise<Transaction[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": transactionPk(userId),
        ":sk": "TXN#",
      },
    }),
  );

  return (result.Items ?? []).map((item) => fromItem(item));
}

export async function clearTransactions(userId: string): Promise<number> {
  const existing = await listTransactions(userId);
  const table = tableName();
  let deleted = 0;

  for (let i = 0; i < existing.length; i += 25) {
    const chunk = existing.slice(i, i + 25);
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: chunk.map((transaction) => ({
            DeleteRequest: {
              Key: {
                pk: transactionPk(userId),
                sk: transactionSk(transaction),
              },
            },
          })),
        },
      }),
    );
    deleted += chunk.length;
  }

  return deleted;
}

export async function putTransaction(
  userId: string,
  transaction: Transaction,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName(),
      Item: toItem(userId, transaction),
    }),
  );
}

export async function deleteTransaction(
  userId: string,
  transaction: Transaction,
): Promise<void> {
  await client.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        pk: transactionPk(userId),
        sk: transactionSk(transaction),
      },
    }),
  );
}

/** Dev helper — not used by API handlers. */
export async function scanAll(): Promise<Transaction[]> {
  const result = await client.send(
    new ScanCommand({
      TableName: tableName(),
      FilterExpression: "entityType = :type",
      ExpressionAttributeValues: { ":type": "transaction" },
    }),
  );
  return (result.Items ?? []).map((item) => fromItem(item));
}
