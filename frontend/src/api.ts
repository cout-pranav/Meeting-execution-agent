/** GET when `body` is omitted, otherwise POST it as JSON. Non-2xx responses throw the server's `error` message. */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body === undefined
      ? undefined
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`);
  return data as T;
}
