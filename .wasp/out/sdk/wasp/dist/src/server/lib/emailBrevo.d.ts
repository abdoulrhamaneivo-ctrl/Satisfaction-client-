export type EmailBrevo = {
    to: string;
    subject: string;
    text: string;
    html: string;
};
export declare function expediteurBrevo(): {
    name: string;
    email: string;
};
export declare function envoyerEmailBrevo({ to, subject, text, html }: EmailBrevo): Promise<void>;
//# sourceMappingURL=emailBrevo.d.ts.map