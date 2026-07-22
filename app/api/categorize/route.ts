import { NextResponse } from "next/server";
import { EXPENSE_CATEGORIES } from "@/types/transaction";
import type { ExpenseCategory } from "@/types/transaction";
import type {
  CategorizeRequest,
  CategorizeResponse,
} from "@/types/categorize";

const CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

function validateRequest(body: unknown): CategorizeRequest | null {
  if (!body || typeof body !== "object") return null;
  const transactions = (body as CategorizeRequest).transactions;
  if (!Array.isArray(transactions) || transactions.length === 0) return null;

  for (const item of transactions) {
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.description !== "string" ||
      !item.id.trim() ||
      !item.description.trim()
    ) {
      return null;
    }
  }

  return { transactions };
}

function validateResponse(data: unknown): CategorizeResponse | null {
  if (!data || typeof data !== "object") return null;
  const results = (data as CategorizeResponse).results;
  if (!Array.isArray(results)) return null;

  const validated: CategorizeResponse["results"] = [];

  for (const item of results) {
    if (!item || typeof item !== "object") return null;
    const { id, category, confidence } = item as {
      id?: unknown;
      category?: unknown;
      confidence?: unknown;
    };

    if (typeof id !== "string" || !id.trim()) return null;
    if (!isExpenseCategory(category)) return null;
    if (typeof confidence !== "number" || Number.isNaN(confidence)) return null;
    if (confidence < 0 || confidence > 1) return null;

    validated.push({ id, category, confidence });
  }

  return { results: validated };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = validateRequest(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Request must include a non-empty transactions array with id and description." },
      { status: 400 },
    );
  }

  const categoryList = EXPENSE_CATEGORIES.join(", ");
  const systemPrompt = [
    "You categorize personal bank and credit-card expense descriptions.",
    `Choose exactly one category from this fixed list: ${categoryList}.`,
    'Never invent new categories. If uncertain, use "Other".',
    "Return structured JSON only with this shape:",
    '{ "results": [ { "id": string, "category": string, "confidence": number } ] }',
    "confidence must be a number between 0 and 1.",
    "Include one result for every input transaction id.",
  ].join(" ");

  try {
    const openAiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify({ transactions: parsed.transactions }),
            },
          ],
        }),
      },
    );

    if (!openAiResponse.ok) {
      const detail = await openAiResponse.text();
      console.error("OpenAI error:", openAiResponse.status, detail);
      return NextResponse.json(
        { error: "Categorization service failed. Please try again." },
        { status: 502 },
      );
    }

    const openAiJson = (await openAiResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = openAiJson.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Categorization service returned an empty response." },
        { status: 502 },
      );
    }

    let modelOutput: unknown;
    try {
      modelOutput = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Categorization service returned invalid JSON." },
        { status: 502 },
      );
    }

    const validated = validateResponse(modelOutput);
    if (!validated) {
      return NextResponse.json(
        { error: "Categorization response failed validation." },
        { status: 502 },
      );
    }

    return NextResponse.json(validated satisfies CategorizeResponse);
  } catch (error) {
    console.error("Categorize route error:", error);
    return NextResponse.json(
      { error: "Unable to categorize expenses right now." },
      { status: 500 },
    );
  }
}
