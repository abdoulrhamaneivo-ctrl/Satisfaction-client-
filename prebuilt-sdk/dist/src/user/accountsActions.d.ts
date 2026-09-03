import { type User } from 'wasp/entities';
export declare const updateProfile: (rawArgs: unknown, context: any) => Promise<User>;
export declare const changePassword: (rawArgs: unknown, context: any) => Promise<{
    success: true;
}>;
export declare const changeEmail: (rawArgs: unknown, context: any) => Promise<User>;
//# sourceMappingURL=accountsActions.d.ts.map