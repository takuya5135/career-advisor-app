"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/auth-context";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "ダッシュボード", href: "/", icon: "🏠" },
    { name: "AIチャット", href: "/chat", icon: "💬" },
    { name: "マイノート", href: "/notes", icon: "📝" },
    { name: "書類作成", href: "/documents", icon: "📄" },
    { name: "志望企業", href: "/companies", icon: "🏢" },
  ];

  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-screen sticky top-0">
      <div className="p-6">
        <Link href="/" className="text-xl font-bold tracking-tight">CareerAdvisor</Link>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          アカウント
        </div>
        <div className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate">
          {user?.email}
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}
