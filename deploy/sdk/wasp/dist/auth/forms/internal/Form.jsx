import { forwardRef } from "react";
import styles from "./Form.module.css";
import "./auth-styles.css";
import { clsx } from "./util";
// PRIVATE API
export const Form = forwardRef(({ children, className, ...props }, ref) => (<form className={clsx(styles.form, className)} {...props} ref={ref}>
    {children}
  </form>));
// PUBLIC API
export const FormItemGroup = forwardRef(({ children, className, ...props }, ref) => (<div className={clsx(styles.formItemGroup, className)} {...props} ref={ref}>
    {children}
  </div>));
// PUBLIC API
export const FormLabel = forwardRef(({ children, className, ...props }, ref) => (<label className={clsx(styles.formLabel, className)} {...props} ref={ref}>
    {children}
  </label>));
// PUBLIC API
export const FormInput = forwardRef(({ className, ...props }, ref) => (<input className={clsx(styles.formInput, className)} {...props} ref={ref}/>));
// PUBLIC API)
export const FormTextarea = forwardRef(({ className, ...props }, ref) => (<textarea className={clsx(styles.formTextarea, className)} {...props} ref={ref}/>));
// PUBLIC API)
export const FormError = forwardRef(({ children, className, ...props }, ref) => (<div className={clsx(styles.formError, className)} {...props} ref={ref}>
    {children}
  </div>));
// PRIVATE API
export const SubmitButton = forwardRef(({ children, className, ...props }, ref) => (<button className={clsx(styles.submitButton, className)} {...props} ref={ref}>
    {children}
  </button>));
//# sourceMappingURL=Form.jsx.map