import { env } from '../env.js';
import { initEmailSender } from "./core/index.js";
const emailProvider = {
    type: "smtp",
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    username: env.SMTP_USERNAME,
    password: env.SMTP_PASSWORD,
};
// PUBLIC API
export const emailSender = initEmailSender(emailProvider);
//# sourceMappingURL=index.js.map