import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as React from "react";
declare function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>): React.JSX.Element;
declare function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>): React.JSX.Element;
declare function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>): React.JSX.Element;
declare function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>): React.JSX.Element;
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
