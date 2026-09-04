import { type Express } from 'express';
import type { Server } from 'node:http';
interface ServerSetupContext {
    app: Express;
    server: Server;
}
export declare function serveStaticClient({ app }: ServerSetupContext): Promise<void>;
export {};
//# sourceMappingURL=staticServing.d.ts.map