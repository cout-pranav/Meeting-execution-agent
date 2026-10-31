import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createMemoryRouter, MemoryRouter } from "react-router";
import { App } from "../App";
import { routes } from "../routes";

/** A fresh cache per test, without retries so failures surface immediately. */
export const testQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

/** Render a component that needs the query client and/or router context. */
export function renderWithProviders(ui: ReactElement, { route = "/" } = {}) {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Render the whole app at `path`; returns the router so tests can assert on navigation. */
export function renderApp(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} queryClient={testQueryClient()} />);
  return router;
}
