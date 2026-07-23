import type { Transaction } from "@/types/transaction";

const USER_ID_STORAGE_KEY = "fiscal:user-id";

export function getApiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

export function isCloudApiConfigured(): boolean {
  return getApiBaseUrl() !== null;
}

/** Stable per-browser id for workspace API calls (localStorage). */
export function getOrCreateBrowserUserId(): string {
  if (typeof window === "undefined") {
    throw new Error("Browser user id is only available in the browser");
  }

  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY)?.trim();
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(USER_ID_STORAGE_KEY, created);
  return created;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }

  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  headers.set("x-user-id", getOrCreateBrowserUserId());

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        response.ok
          ? "API returned invalid JSON"
          : `API error (${response.status})`,
      );
    }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `API error (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

type PresignResponse = {
  uploadUrl: string;
  key: string;
  uploadId: string;
  headers: Record<string, string>;
};

type ProcessResponse = {
  format: "checking" | "credit";
  transactionCount: number;
  key: string;
};

export async function presignUpload(
  fileName: string,
  contentType = "text/csv",
): Promise<PresignResponse> {
  return apiFetch<PresignResponse>("/uploads/presign", {
    method: "POST",
    body: JSON.stringify({ fileName, contentType }),
  });
}

export async function processUpload(key: string): Promise<ProcessResponse> {
  return apiFetch<ProcessResponse>("/uploads/process", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const data = await apiFetch<{ transactions: Transaction[] }>("/transactions");
  return data.transactions ?? [];
}

export async function clearRemoteTransactions(): Promise<number> {
  const data = await apiFetch<{ deleted: number }>("/transactions", {
    method: "DELETE",
  });
  return data.deleted;
}

export async function uploadCsvToCloud(file: File): Promise<ProcessResponse> {
  const contentType = file.type || "text/csv";
  const presign = await presignUpload(file.name, contentType);

  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`S3 upload failed (${putResponse.status})`);
  }

  return processUpload(presign.key);
}
