import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import { logout } from "wasp/client/auth";
import { Link as WaspRouterLink } from "wasp/client/router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";

export function UserDropdown({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const displayName = user?.prenom
    ? `${user.prenom} ${user.nom || ''}`.trim()
    : (user?.email || 'Agent');

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-muted/60 transition-colors text-foreground select-none">
          <div className="size-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-black text-xs shrink-0">
            {displayName[0]?.toUpperCase()}
          </div>
          <span className="text-xs font-bold font-satoshi hidden lg:block max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border/80 shadow-premium p-1 space-y-0.5">
        <div className="px-3 py-2 border-b border-border/60 mb-1">
          <p className="text-xs font-black truncate">{displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase">
            {user?.role || 'CHEF_AGENCE'}
          </span>
        </div>
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <WaspRouterLink
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-foreground hover:text-primary"
          >
            <Settings className="size-4 text-primary" />
            Paramètres & Clés IA
          </WaspRouterLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="flex w-full items-center gap-2.5 px-2.5 py-2 text-xs font-semibold"
          >
            <LogOut className="size-4" />
            Se déconnecter
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
