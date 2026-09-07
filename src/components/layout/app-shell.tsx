"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, ClipboardList, Database, Factory, Home, LogOut, PackageCheck, ReceiptText, Shield, ShoppingBag, Siren, Users, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today", label: "TODAY", icon: Home },
  { href: "/guide", label: "Panduan", icon: BookOpen },
  { href: "/buyers", label: "Buyer", icon: Users },
  { href: "/orders", label: "Order", icon: ShoppingBag },
  { href: "/pricing", label: "Pricing", icon: ReceiptText },
  { href: "/batches", label: "Batch", icon: Factory },
  { href: "/production-flow", label: "Produksi", icon: PackageCheck },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/tasks", label: "Task", icon: ClipboardList },
  { href: "/exceptions", label: "Exception", icon: Siren },
  { href: "/master-data", label: "Master Data", icon: Database },
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/reports", label: "Dashboard", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<{ nama: string; username: string; roles: string[] }>("/api/auth/me") });

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch((error) => toast.error(error.message));
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <div>
            <p className="text-sm font-semibold tracking-wide text-red-700 dark:text-red-300">BOS SYAMS</p>
            <p className="text-xs text-muted">operating subledger</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-red-700 text-white dark:bg-red-500 dark:text-zinc-950"
                    : "text-muted hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border bg-background/92 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted">Syams Garment Manufacturer</p>
              <p className="truncate text-sm text-foreground">{me.data?.nama ?? "Memuat user..."}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 lg:hidden">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  pathname === href ? "bg-red-700 text-white" : "text-muted",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
