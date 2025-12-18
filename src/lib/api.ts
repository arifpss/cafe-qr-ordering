export type ApiError = {
  error: string;
  details?: unknown;
};

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as ApiError;
      message = data.error ?? message;
    } catch (error) {
      // ignore parsing error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiPost = async <T>(path: string, body: unknown) => {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
};
