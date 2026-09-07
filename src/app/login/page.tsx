"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Panel, TextInput } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<main className="grid min-h-screen place-items-center bg-background text-foreground">Memuat...</main>}>
      <LoginContent />
    </React.Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      toast.success("Login berhasil");
      router.push(search.get("return_to") || "/today");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">BOS SYAMS</p>
            <h1 className="text-2xl font-semibold">Masuk Back Office</h1>
          </div>
          <ThemeToggle />
        </div>
        <Panel>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Username</label>
              <TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Password</label>
              <TextInput value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="admin123 setelah seed awal" />
            </div>
            <Button disabled={loading} type="submit">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Masuk
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}
