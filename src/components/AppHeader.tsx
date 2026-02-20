import Link from "next/link";
import { LogOut } from "lucide-react";

interface AppHeaderProps {
  userEmail: string;
  currentPath: string;
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks',     label: 'Tasks'     },
  { href: '/radar',     label: 'Radar'     },
];

export default function AppHeader({ userEmail, currentPath }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45" />
            </div>
            <span className="font-black tracking-tighter text-xl">CH_OS</span>
          </div>
          <nav className="flex items-center space-x-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = currentPath === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive
                      ? "px-3 py-1.5 rounded-lg text-sm font-bold text-slate-900 bg-slate-100"
                      : "px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Operative</span>
            <span className="text-sm font-bold text-slate-900">{userEmail}</span>
          </div>
          <form action="/auth/sign-out" method="post">
            <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
