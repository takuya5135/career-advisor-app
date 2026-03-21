"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "ホーム", href: "/", icon: "🏠" },
    { name: "チャット", href: "/chat", icon: "💬" },
    { name: "ノート", href: "/notes", icon: "📝" },
    { name: "書類", href: "/documents", icon: "📄" },
    { name: "企業", href: "/companies", icon: "🏢" },
    { name: "プロフ", href: "/profile", icon: "👤" },
  ];

  return (
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl z-50 flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-all ${
              isActive
                ? "text-black dark:text-white scale-110"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={`text-[10px] font-bold ${isActive ? "opacity-100" : "opacity-0"} transition-opacity`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
