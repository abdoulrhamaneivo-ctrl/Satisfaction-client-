import { api, handleApiError } from 'wasp/client/api';
import { SuccessResponseSchema } from '../../responseSchemas';
// PUBLIC API
export async function signup(data) {
    try {
        const { success } = await api.post('/auth/email/signup', {
            json: data,
        }).json(SuccessResponseSchema);
        return { success };
    }
    catch (e) {
        throw handleApiError(e);
    }
}
//# sourceMappingURL=signup.js.map