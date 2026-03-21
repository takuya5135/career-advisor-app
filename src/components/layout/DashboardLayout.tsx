"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black font-sans relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {children}
        <div className="h-28 md:hidden" /> {/* ボトムナビゲーション用のパディング */}
      </main>
      <MobileNav />
    </div>
  );
}
