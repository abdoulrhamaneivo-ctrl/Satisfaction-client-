import { use } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInitialized } from '../../operations/index';
export function WaspApp({ children }) {
    const queryClient = use(queryClientInitialized);
    return (<QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>);
}
//# sourceMappingURL=WaspApp.jsx.map