import { createTransport } from "nodemailer";
import { formatFromField, getDefaultFromField } from "../helpers.js";
// PRIVATE API
export function initSmtpEmailSender(config) {
    const transporter = createTransport({
        host: config.host,
        port: config.port,
        auth: {
            user: config.username,
            pass: config.password,
        },
    });
    const defaultFromField = getDefaultFromField();
    return {
        async send(email) {
            return transporter.sendMail({
                from: formatFromField(email.from || defaultFromField),
                to: email.to,
                subject: email.subject,
                text: email.text,
                html: email.html,
            });
        },
    };
}
//# sourceMappingURL=smtp.js.map