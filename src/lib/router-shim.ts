// react-router-dom -> TanStack Router uyum katmanı
// Sayfaları minimum değişiklikle taşımak için.
import {
  Link as TSLink,
  useNavigate as tsUseNavigate,
  useParams as tsUseParams,
  useLocation as tsUseLocation,
  useRouter,
} from "@tanstack/react-router";
import { forwardRef, type ComponentProps, type ReactNode } from "react";

export function useNavigate() {
  const nav = tsUseNavigate();
  // react-router-dom: navigate("/foo") veya navigate(-1) veya navigate("/foo", { replace: true })
  return (to: string | number, opts?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    nav({ to, replace: opts?.replace });
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return tsUseParams({ strict: false }) as T;
}

export function useLocation() {
  const loc = tsUseLocation();
  return {
    pathname: loc.pathname,
    search: loc.search ? "?" + new URLSearchParams(loc.search as Record<string, string>).toString() : "",
    hash: loc.hash,
    state: loc.state,
  };
}

type LinkProps = {
  to: string;
  children?: ReactNode;
  className?: string;
  replace?: boolean;
} & Omit<ComponentProps<"a">, "href">;

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, children, className, replace, ...rest },
  ref,
) {
  return (
    <TSLink to={to} replace={replace} className={className} ref={ref as any} {...(rest as any)}>
      {children}
    </TSLink>
  );
});

type NavLinkProps = LinkProps & {
  end?: boolean;
  className?: string | ((args: { isActive: boolean }) => string);
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, children, className, end, ...rest },
  ref,
) {
  return (
    <TSLink
      to={to}
      activeOptions={{ exact: end }}
      ref={ref as any}
      {...(rest as any)}
      className={({ isActive }: { isActive: boolean }) =>
        typeof className === "function" ? className({ isActive }) : className || ""
      }
    >
      {children as any}
    </TSLink>
  );
});

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const nav = tsUseNavigate();
  // microtask redirect
  Promise.resolve().then(() => nav({ to, replace }));
  return null;
}

export function Outlet() {
  // re-export not needed; sayfalar Outlet kullanmıyor (App.tsx'te Routes vardı)
  return null;
}

export { useRouter };
