
import { useState, type PropsWithChildren } from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

export default function QueryProvider({
  children,
}: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
