"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, ListTodo, Radio, Package } from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tasks",     icon: ListTodo,        label: "Tasks"     },
  { href: "/radar",     icon: Radio,           label: "Radar"     },
  { href: "/inventory", icon: Package,         label: "Inventory" },
];

const COLLAPSED_W = 48;
const EXPANDED_W  = 176;

interface AppSidebarProps {
  userEmail?: string;
}

export default function AppSidebar({ userEmail = "" }: AppSidebarProps) {
  const pathname = usePathname();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "··";
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="fixed left-0 top-0 h-screen bg-sidebar flex flex-col py-4 z-50 overflow-hidden"
      initial={{ width: COLLAPSED_W }}
      animate={{ width: expanded ? EXPANDED_W : COLLAPSED_W }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo mark — always centred in the icon column */}
      <div className="h-8 mb-6 shrink-0 flex items-center pl-[14px]">
        <div className="w-3.5 h-3.5 bg-white rotate-45 shrink-0" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 w-full px-1.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className="relative h-10 flex items-center rounded-lg group"
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

              {/* Icon — pinned at a fixed left offset so it never shifts */}
              <span className="pl-[14px] shrink-0">
                <Icon
                  className={clsx(
                    "w-5 h-5 transition-colors duration-150",
                    active
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-300",
                  )}
                />
              </span>

              {/* Label — fades in when expanded */}
              <motion.span
                animate={{
                  opacity: expanded ? 1 : 0,
                  x:       expanded ? 0  : -6,
                }}
                transition={{ duration: 0.18, delay: expanded ? 0.06 : 0 }}
                className={clsx(
                  "ml-3 text-[13px] font-medium whitespace-nowrap select-none",
                  active
                    ? "text-white"
                    : "text-slate-400 group-hover:text-slate-200",
                )}
              >
                {label}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      {/* User avatar / sign-out */}
      <div className="shrink-0 flex items-center pl-[12px]">
        <form action="/auth/sign-out" method="post">
          <button
            title={`Sign out (${userEmail})`}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 text-[10px] font-black flex items-center justify-center hover:bg-red-900/60 hover:text-red-300 transition-colors"
          >
            {initials}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
