import { forwardRef } from "react";
import styles from "./Message.module.css";
import "./auth-styles.css";
import { clsx } from "./util";
// PRIVATE API
export const Message = forwardRef(({ children, className, ...props }, ref) => (<div className={clsx(styles.message, className)} {...props} ref={ref}>
    {children}
  </div>));
// PRIVATE API
export const MessageError = forwardRef(({ children, className, ...props }, ref) => (<div className={clsx(styles.messageError, className)} {...props} ref={ref}>
    {children}
  </div>));
// PRIVATE API
export const MessageSuccess = forwardRef(({ children, className, ...props }, ref) => (<div className={clsx(styles.messageSuccess, className)} {...props} ref={ref}>
    {children}
  </div>));
//# sourceMappingURL=Message.jsx.map