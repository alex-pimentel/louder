import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@agenteresolve/ui";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const Indicator = CheckboxPrimitive.Indicator as unknown as React.ComponentType<
    React.HTMLAttributes<HTMLSpanElement> & { forceMount?: boolean }
  >;

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-[state=checked]:border-foreground data-[state=checked]:bg-foreground",
        "data-[state=checked]:text-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
