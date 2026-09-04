import { Router } from "express";
import { getLoginRoute } from "../email/login.js";
import { getSignupRoute } from "../email/signup.js";
import { getRequestPasswordResetRoute } from "../email/requestPasswordReset.js";
import { resetPassword } from "../email/resetPassword.js";
import { verifyEmail } from "../email/verifyEmail.js";
import { defineHandler } from "wasp/server/utils";
import { getEmailUserFields } from '../../../../../../../src/auth/userSignupFields';
const _waspUserSignupFields = getEmailUserFields;
import { getVerificationEmailContent } from '../../../../../../../src/auth/email-and-pass/emails';
const _waspGetVerificationEmailContent = getVerificationEmailContent;
import { getPasswordResetEmailContent } from '../../../../../../../src/auth/email-and-pass/emails';
const _waspGetPasswordResetEmailContent = getPasswordResetEmailContent;
const fromField = {
    name: 'Yeba Abidjan',
    email: 'abdoulrhamane.ivo@gmail.com',
};
const config = {
    id: "email",
    displayName: "Email and password",
    createRouter() {
        const router = Router();
        const loginRoute = defineHandler(getLoginRoute());
        router.post('/login', loginRoute);
        const signupRoute = defineHandler(getSignupRoute({
            userSignupFields: _waspUserSignupFields,
            fromField,
            clientRoute: '/email-verification',
            getVerificationEmailContent: _waspGetVerificationEmailContent,
            isEmailAutoVerified: false,
        }));
        router.post('/signup', signupRoute);
        const requestPasswordResetRoute = defineHandler(getRequestPasswordResetRoute({
            fromField,
            clientRoute: '/password-reset',
            getPasswordResetEmailContent: _waspGetPasswordResetEmailContent,
        }));
        router.post('/request-password-reset', requestPasswordResetRoute);
        router.post('/reset-password', defineHandler(resetPassword));
        router.post('/verify-email', defineHandler(verifyEmail));
        return router;
    },
};
export default config;
//# sourceMappingURL=email.js.map