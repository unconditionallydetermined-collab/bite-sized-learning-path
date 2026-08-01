import { Link } from "@tanstack/react-router";
import { Music, ShoppingBag, Swords, User } from "lucide-react";

const items = [
  { to: "/path", label: "Learn", Icon: Swords },
  { to: "/music", label: "Music", Icon: Music },
  { to: "/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/settings/profile", label: "Profile", Icon: User },
] as const;

/** Duolingo-style bottom tab bar mapped onto the app's existing sections. */
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2 py-2">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeProps={{ "data-active": "true" }}
              className="tap-bounce group flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-muted-foreground data-[active=true]:text-primary"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border-2 border-transparent transition-colors group-data-[active=true]:border-primary group-data-[active=true]:bg-primary/15">
                <Icon className="size-5" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
