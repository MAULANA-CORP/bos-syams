"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, BarChart3, BookOpen, BriefcaseBusiness, ClipboardCheck, ClipboardList, Clock3, Database, Factory, HandCoins, Home, LogOut, Menu, PackageCheck, PanelLeftClose, PanelLeftOpen, ReceiptText, Shield, ShoppingBag, Siren, SwatchBook, TabletSmartphone, Truck, Users, Warehouse, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRoleCode } from "@/lib/domain-types";
import { api } from "@/lib/client-api";
import { NAVIGATION_POLICY, canAccessNavigationItem, formatRoleSummary, matchesNavigationPath, type NavigationPolicyItem, type PermissionSummary } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type NavigationItem = NavigationPolicyItem & {
  icon: LucideIcon;
};

type MeResponse = {
  nama: string;
  username: string;
  roles: UserRoleCode[];
  permissions: PermissionSummary[];
};

const navIcons: Record<string, LucideIcon> = {
  "/today": Home,
  "/guide": BookOpen,
  "/buyers": Users,
  "/orders": ShoppingBag,
  "/pricing": ReceiptText,
  "/batches": Factory,
  "/production-flow": PackageCheck,
  "/inventory": Warehouse,
  "/shipments": Truck,
  "/finance": HandCoins,
  "/portal-admin": TabletSmartphone,
  "/crm": BriefcaseBusiness,
  "/samples": SwatchBook,
  "/makloon": Factory,
  "/people": Users,
  "/control-tower": BarChart3,
  "/request-revision": ClipboardCheck,
  "/order-changes": ArrowLeftRight,
  "/sla": Clock3,
  "/tasks": ClipboardList,
  "/exceptions": Siren,
  "/master-data": Database,
  "/admin": Shield,
  "/reports": BarChart3,
};

const nav: NavigationItem[] = NAVIGATION_POLICY.map((item) => ({ ...item, icon: navIcons[item.href] ?? Home }));

function NavigationLinks({
  items,
  pathname,
  compact = false,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navigasi utama" className="space-y-1 p-3">
      {items.map(({ href, label, icon: Icon }) => {
        const active = matchesNavigationPath({ href, label }, pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={compact ? label : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-md text-sm font-medium transition-colors",
              compact ? "justify-center px-3" : "gap-3 px-3",
              active
                ? "bg-red-700 text-white dark:bg-red-500 dark:text-zinc-950"
                : "text-muted hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={compact ? "sr-only" : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<MeResponse>("/api/auth/me"), refetchOnMount: "always" });
  const permissions = useMemo(() => me.data?.permissions ?? [], [me.data]);
  const roles = useMemo(() => me.data?.roles ?? [], [me.data]);
  const visibleNav = useMemo(() => nav.filter((item) => item.showInNavigation !== false && canAccessNavigationItem(item, { roles, permissions })), [permissions, roles]);
  const currentItem = useMemo(() => nav.find((item) => matchesNavigationPath(item, pathname)), [pathname]);
  const canAccessCurrentPage = !currentItem || canAccessNavigationItem(currentItem, { roles, permissions });
  const roleSummary = useMemo(() => formatRoleSummary(roles), [roles]);

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    if (me.isError) router.replace("/login");
  }, [me.isError, router]);

  useEffect(() => {
    if (!me.data || canAccessCurrentPage) return;
    const fallback = visibleNav[0]?.href ?? "/today";
    toast.error("Halaman ini tidak tersedia untuk role Anda.");
    router.replace(fallback);
  }, [canAccessCurrentPage, me.data, router, visibleNav]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" }).catch((error) => toast.error(error.message));
    queryClient.clear();
    router.push("/login");
  }

  const sidebarWidth = collapsed ? "lg:pl-[76px]" : "lg:pl-64";

  if (me.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-sm text-muted" aria-busy="true">
        Memuat akses pengguna...
      </div>
    );
  }

  if (me.isError || !canAccessCurrentPage) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-sm text-muted">
        Mengarahkan ke halaman yang diizinkan...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={cn("fixed inset-y-0 left-0 z-20 hidden border-r border-border bg-card transition-[width] duration-200 lg:block", collapsed ? "w-[76px]" : "w-64")}>
        <div className={cn("flex h-16 items-center border-b border-border", collapsed ? "justify-center px-3" : "justify-between px-5")}>
          {collapsed ? (
            <span className="text-sm font-semibold text-red-700 dark:text-red-300" title="BOS SYAMS">BS</span>
          ) : (
            <div>
              <p className="text-sm font-semibold tracking-wide text-red-700 dark:text-red-300">BOS SYAMS</p>
              <p className="text-xs text-muted">{roleSummary}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Lebarkan menu" : "Ciutkan menu"}
            className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800", collapsed && "absolute -right-4 top-4 border border-border bg-card")}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <NavigationLinks items={visibleNav} pathname={pathname} compact={collapsed} />
      </aside>

      <div className={cn("transition-[padding] duration-200", sidebarWidth)}>
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                title="Buka menu"
                aria-label="Buka menu"
                aria-expanded={mobileOpen}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted">Syams Garment Manufacturer</p>
                <p className="truncate text-sm text-foreground">{me.data.nama} · {roleSummary}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 cursor-default bg-black/45"
            onClick={() => setMobileOpen(false)}
          />
          <aside role="dialog" aria-modal="true" aria-label="Menu navigasi" className="relative flex h-full w-[min(19rem,86vw)] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <div>
                <p className="text-sm font-semibold tracking-wide text-red-700 dark:text-red-300">BOS SYAMS</p>
                <p className="text-xs text-muted">{roleSummary}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                title="Tutup menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavigationLinks items={visibleNav} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
