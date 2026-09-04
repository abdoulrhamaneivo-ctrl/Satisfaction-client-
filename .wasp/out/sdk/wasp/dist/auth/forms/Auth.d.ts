import './internal/auth-styles.css';
import { type State, type CustomizationOptions, type AdditionalSignupFields } from './types';
declare function Auth({ state, appearance, logo, socialLayout, additionalSignupFields }: {
    state: State;
} & CustomizationOptions & {
    additionalSignupFields?: AdditionalSignupFields;
}): import("react").JSX.Element;
export default Auth;
//# sourceMappingURL=Auth.d.ts.map