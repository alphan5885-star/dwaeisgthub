import { Link as TSLink } from "@tanstack/react-router";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<ComponentProps<typeof TSLink>, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, ...props }, ref) => {
    return (
      <TSLink
        ref={ref as never}
        {...(props as never)}
        className={({ isActive }: { isActive: boolean }) =>
          cn(className, isActive && activeClassName)
        }
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
