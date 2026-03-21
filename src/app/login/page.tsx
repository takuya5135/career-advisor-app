"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError("ログインに失敗しました。メールアドレスまたはパスワードを確認してください。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("パスワードを再設定するには、まずメールアドレスを入力してください。");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await resetPassword(email);
      setSuccess("パスワード再設定用のメールを送信しました。メールボックスを確認してください。");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("このメールアドレスは登録されていません。");
      } else {
        setError("メールの送信に失敗しました。時間をおいて再度お試しください。");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">おかえりなさい</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">キャリアアドバイザーにログイン</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-lg">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all"
                placeholder="example@mail.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  パスワード
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-semibold text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  パスワードを忘れた場合はこちら
                </button>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-black hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:opacity-50"
          >
            {loading ? "処理中..." : "ログイン"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            アカウントをお持ちでないですか？{" "}
            <Link href="/signup" className="font-semibold text-black dark:text-white hover:underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
