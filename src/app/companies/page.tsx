"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getCompanies, saveCompanyData, CompanyData } from "@/lib/firebase/firestore";
import FilteredLink from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function CompaniesPage() {
  const { user, loading } = useAuth();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const router = useRouter();

  const fetchCompanies = async () => {
    if (user) {
      setIsRefreshing(true);
      const data = await getCompanies(user.uid);
      setCompanies(data);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchCompanies();
    }
  }, [user, loading, router]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCompanyName.trim()) return;

    try {
      await saveCompanyData(user.uid, {
        name: newCompanyName.trim(),
        status: 'considering'
      });
      setNewCompanyName("");
      setIsAdding(false);
      fetchCompanies();
    } catch (error) {
      console.error("Failed to add company:", error);
    }
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      {/* メインエリア */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-y-auto">
        <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold">志望企業リスト</h2>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:opacity-80 transition-opacity text-sm"
          >
            + 企業を追加
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          {isAdding && (
            <div className="mb-8 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-200">
              <form onSubmit={handleAddCompany} className="flex gap-4">
                <input 
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="企業名を入力 (例: 株式会社サンプル)"
                  autoFocus
                  className="flex-1 px-4 py-2 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                />
                <button 
                  type="submit"
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold"
                >
                  追加
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-zinc-500 font-medium"
                >
                  キャンセル
                </button>
              </form>
            </div>
          )}

          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="text-6xl text-zinc-200">🏢</div>
              <div>
                <h3 className="text-xl font-bold">企業が登録されていません</h3>
                <p className="text-zinc-500 mt-2">志望する企業を追加して、AIと一緒に面接対策を始めましょう。</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((company) => (
                <FilteredLink 
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-black dark:hover:border-white transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{company.name}</h3>
                      <p className="text-sm text-zinc-500">{company.industry || "業種未設定"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      company.status === 'offered' ? 'bg-green-100 text-green-700' :
                      company.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {company.status === 'considering' ? '検討中' :
                       company.status === 'applied' ? '応募済み' :
                       company.status === 'interviewing' ? '面接中' :
                       company.status === 'offered' ? '内定' : 'お見送り'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs">
                        {company.matchingAnalysis?.score || 0}%
                      </div>
                      <span className="text-xs text-zinc-500">マッチ度</span>
                    </div>
                    <span className="text-xs text-blue-500 font-medium">詳細を見る →</span>
                  </div>
                </FilteredLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
