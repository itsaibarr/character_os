"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, ListTodo, Radio } from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks",     icon: ListTodo,        label: "Tasks"     },
  { href: "/radar",     icon: Radio,           label: "Radar"     },
];

interface AppSidebarProps {
  userEmail?: string;
}

export default function AppSidebar({ userEmail = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "··";

  return (
    <div className="fixed left-0 top-0 h-screen w-12 bg-sidebar flex flex-col items-center py-4 z-50">
      {/* Logo mark */}
      <div className="w-8 h-8 flex items-center justify-center mb-6 shrink-0">
        <div className="w-3.5 h-3.5 bg-white rotate-45" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg group"
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              {active && (
                <motion.div
                  layoutId="sidebar-active-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.15 }}>
                <Icon
                  className={clsx(
                    "w-5 h-5 transition-colors duration-150",
                    active
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User avatar / sign-out */}
      <form action="/auth/sign-out" method="post" className="shrink-0">
        <button
          title={`Sign out (${userEmail})`}
          className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center hover:bg-red-900/60 hover:text-red-300 transition-colors"
        >
          {initials}
        </button>
      </form>
    </div>
  );
}
