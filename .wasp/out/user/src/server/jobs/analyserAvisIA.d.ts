export declare const analyserAvisIAJob: (_args: unknown, _context: any) => Promise<{
    status: string;
    message: string;
    count?: undefined;
    processed?: undefined;
    success?: undefined;
    failed?: undefined;
} | {
    status: string;
    count: number;
    message?: undefined;
    processed?: undefined;
    success?: undefined;
    failed?: undefined;
} | {
    status: string;
    processed: number;
    success: number;
    failed: number;
    message?: undefined;
    count?: undefined;
}>;
