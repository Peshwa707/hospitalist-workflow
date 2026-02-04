'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Stethoscope, Home, History, Users, Clock, ClipboardList, Sun, ArrowRightLeft, FileText, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Workflow', icon: Home },
  { href: '/briefing', label: 'Briefing', icon: Sun },
  { href: '/rounding', label: 'Rounding', icon: Clock },
  { href: '/signout', label: 'Signout', icon: ArrowRightLeft },
  { href: '/clinical-summary', label: 'Summary', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            <span>Hospitalist AI</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
