import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { RouterProvider, type createBrowserRouter } from "react-router";

type Props = { router: ReturnType<typeof createBrowserRouter>; queryClient: QueryClient };

/** Providers only: the routes (and the pages they render) live in routes.tsx. */
export function App({ router, queryClient }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
