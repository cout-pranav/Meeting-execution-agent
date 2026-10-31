import axios, { isAxiosError } from "axios";
import type { Health, Item, ItemAction } from "./types";

/**
 * Same-origin client: Vite (dev) and nginx (Docker) proxy `/api` to the Bun API.
 * The fetch adapter keeps requests on `fetch`, which the unit tests stub; an absolute
 * base URL lets it build a `Request` outside the browser too (Node's needs one).
 */
export const http = axios.create({ adapter: "fetch", baseURL: window.location.origin });

// Non-2xx responses reject with the server's `error` message, falling back to the status.
http.interceptors.response.use(undefined, (e: unknown) => {
  if (isAxiosError<{ error?: string }>(e) && e.response) {
    const { data, status, statusText } = e.response;
    return Promise.reject(new Error((typeof data === "object" && data?.error) || `${status} ${statusText}`));
  }
  return Promise.reject(e);
});

export type NewMeeting = { title: string; transcript: string; date: string };
export type Extraction = { items: unknown[]; conflicts: unknown[] };

export const getItems = () => http.get<Item[]>("/api/items").then((r) => r.data);
export const getHealth = () => http.get<Health>("/api/health").then((r) => r.data);
export const actOnItem = (id: number, action: ItemAction) => http.post<Item>(`/api/items/${id}/${action}`, {}).then((r) => r.data);
export const ingestMeeting = (meeting: NewMeeting) => http.post<Extraction>("/api/meetings", meeting).then((r) => r.data);
