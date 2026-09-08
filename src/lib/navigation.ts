import type { ModuleCode, PermissionAction, UserRoleCode } from "@/lib/domain-types";

export type PermissionSummary = { modul: ModuleCode; aksi: PermissionAction };

export type NavigationPolicyItem = {
  href: string;
  label: string;
  modules?: ModuleCode[];
  roles?: UserRoleCode[];
  showInNavigation?: boolean;
};

export const INTERNAL_ROLES: UserRoleCode[] = [
  "CEO",
  "CMO_MANAGER",
  "CMO_SUPPORT",
  "PRODUCTION_CONTROLLER",
  "PRODUCTION_USER",
  "WAREHOUSE_PURCHASING",
  "CFO",
  "CHRO",
  "QC",
  "SYSTEM_ADMIN",
];

export const BUSINESS_ROLES: UserRoleCode[] = INTERNAL_ROLES.filter((role) => role !== "SYSTEM_ADMIN");

export const ROLE_LABELS: Record<UserRoleCode, string> = {
  CEO: "Owner / CEO",
  CMO_MANAGER: "CMO Manager",
  CMO_SUPPORT: "CMO Support",
  PRODUCTION_CONTROLLER: "COO / Production Controller",
  PRODUCTION_USER: "Production User",
  WAREHOUSE_PURCHASING: "Warehouse / Purchasing",
  CFO: "Finance / CFO",
  CHRO: "CHRO",
  QC: "Quality Control",
  SYSTEM_ADMIN: "System Admin",
};

export const NAVIGATION_POLICY: NavigationPolicyItem[] = [
  { href: "/today", label: "TODAY", roles: INTERNAL_ROLES },
  { href: "/guide", label: "Panduan", roles: INTERNAL_ROLES },
  { href: "/buyers", label: "Buyer", modules: ["BUYER"], roles: ["CMO_MANAGER", "CMO_SUPPORT"] },
  { href: "/orders", label: "Order", modules: ["ORDER"], roles: ["CMO_MANAGER", "CMO_SUPPORT"] },
  { href: "/pricing", label: "Pricing", modules: ["QUOTATION"], roles: ["CMO_MANAGER", "CMO_SUPPORT", "CFO"] },
  { href: "/batches", label: "Batch", modules: ["BATCH"], roles: ["PRODUCTION_CONTROLLER", "PRODUCTION_USER"] },
  { href: "/production-flow", label: "Produksi", modules: ["PRODUCTION", "QC", "PACKING"], roles: ["PRODUCTION_CONTROLLER", "PRODUCTION_USER", "WAREHOUSE_PURCHASING", "QC"] },
  { href: "/inventory", label: "Inventory", modules: ["PROCUREMENT", "INVENTORY"], roles: ["WAREHOUSE_PURCHASING"] },
  { href: "/shipments", label: "Shipment", modules: ["SHIPMENT"], roles: ["CMO_MANAGER", "WAREHOUSE_PURCHASING", "CFO"] },
  { href: "/finance", label: "Finance", modules: ["INVOICE", "PAYMENT"], roles: ["CFO"] },
  { href: "/portal-admin", label: "Portal Admin", modules: ["PORTAL"], roles: ["CMO_MANAGER", "CMO_SUPPORT"] },
  { href: "/crm", label: "CRM", modules: ["CRM"], roles: ["CMO_MANAGER", "CMO_SUPPORT"] },
  { href: "/samples", label: "Sample", modules: ["SAMPLE"], roles: ["CMO_MANAGER", "CMO_SUPPORT", "QC"] },
  { href: "/makloon", label: "Makloon", modules: ["MAKLOON"], roles: ["PRODUCTION_CONTROLLER", "PRODUCTION_USER", "WAREHOUSE_PURCHASING"] },
  { href: "/people", label: "People", modules: ["EMPLOYEE", "MANPOWER"], roles: ["CHRO"] },
  { href: "/control-tower", label: "CEO Tower", modules: ["CONTROL_TOWER"], roles: ["CEO"] },
  { href: "/request-revision", label: "Request Revision", modules: ["REVISION"], roles: ["CEO", "CMO_MANAGER", "CMO_SUPPORT", "PRODUCTION_CONTROLLER"] },
  { href: "/order-changes", label: "Change Request", modules: ["ORDER_CHANGE"], roles: ["CEO", "CMO_MANAGER", "CMO_SUPPORT", "PRODUCTION_CONTROLLER", "CFO"] },
  { href: "/sla", label: "SLA & Delegation", modules: ["SLA_RULE", "DELEGATION"], roles: ["CEO", "CMO_MANAGER", "PRODUCTION_CONTROLLER", "CHRO"] },
  { href: "/tasks", label: "Task", modules: ["TASK"], roles: BUSINESS_ROLES },
  { href: "/exceptions", label: "Exception", modules: ["EXCEPTION"], roles: ["CEO", "CMO_MANAGER", "PRODUCTION_CONTROLLER", "WAREHOUSE_PURCHASING", "CFO", "CHRO", "QC"] },
  { href: "/master-data", label: "Master Data", modules: ["MASTER_DATA"], roles: ["SYSTEM_ADMIN", "WAREHOUSE_PURCHASING", "CFO"] },
  { href: "/admin", label: "Admin", modules: ["USER", "PERMISSION"], roles: ["SYSTEM_ADMIN"] },
  { href: "/reports", label: "Dashboard", modules: ["CONTROL_TOWER"], roles: ["CEO"], showInNavigation: false },
];

export function matchesNavigationPath(item: NavigationPolicyItem, pathname: string) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function canAccessNavigationItem(
  item: NavigationPolicyItem,
  actor: { roles: UserRoleCode[]; permissions: PermissionSummary[] },
) {
  const roleAllowed = !item.roles || item.roles.some((role) => actor.roles.includes(role));
  if (!roleAllowed) return false;
  if (!item.modules) return true;
  return item.modules.some((modul) => actor.permissions.some((permission) => permission.modul === modul && permission.aksi === "VIEW"));
}

export function getVisibleNavigationItems(actor: { roles: UserRoleCode[]; permissions: PermissionSummary[] }) {
  return NAVIGATION_POLICY.filter((item) => item.showInNavigation !== false && canAccessNavigationItem(item, actor));
}

export function formatRoleSummary(roles: UserRoleCode[]) {
  if (roles.length === 0) return "Tanpa role";
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(" + ");
}
