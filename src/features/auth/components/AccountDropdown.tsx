import { Link } from '@tanstack/react-router';
import { LogOut, UserRound } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import { AccountTrigger } from './account-trigger';

type AccountDropdownProps = {
  displayName: string;
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
  logoutPending: boolean;
};

/** Menu da conta (chunk próprio: Radix Menu + Floating UI só baixam quando vão ser usados). */
export default function AccountDropdown({
  displayName,
  email,
  open,
  onOpenChange,
  onLogout,
  logoutPending,
}: AccountDropdownProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <AccountTrigger displayName={displayName} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound aria-hidden="true" strokeWidth={1.5} />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} disabled={logoutPending}>
          <LogOut aria-hidden="true" strokeWidth={1.5} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
