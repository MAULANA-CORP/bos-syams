export const MODULES = [
  "BUYER",
  "ORDER",
  "ARTICLE",
  "BATCH",
  "QUOTATION",
  "PRODUCTION",
  "QC",
  "PACKING",
  "MASTER_DATA",
  "TASK",
  "EXCEPTION",
  "AUDIT",
  "USER",
  "PERMISSION",
] as const;

export const ACTIONS = ["VIEW", "CREATE", "EDIT", "APPROVE", "EXECUTE", "OVERRIDE"] as const;

export type ModuleCode = (typeof MODULES)[number];
export type PermissionAction = (typeof ACTIONS)[number];

export type UserRoleCode =
  | "CEO"
  | "CMO_MANAGER"
  | "CMO_SUPPORT"
  | "PRODUCTION_CONTROLLER"
  | "PRODUCTION_USER"
  | "WAREHOUSE_PURCHASING"
  | "CFO"
  | "CHRO"
  | "QC"
  | "SYSTEM_ADMIN";

export type PermissionScope =
  | "ALL_COMPANY"
  | "DEPARTMENT"
  | "TEAM"
  | "ASSIGNED"
  | "PRODUCTION"
  | "INVENTORY"
  | "FINANCE"
  | "PEOPLE"
  | "QUALITY"
  | "CUSTOMER_OWN_DATA"
  | "SYSTEM";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "VOID"
  | "REVERSE"
  | "CORRECT"
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "EXPORT"
  | "PERMISSION_CHANGE";

export interface Actor {
  id: string;
  nama: string;
  username: string;
  roles: UserRoleCode[];
  scopes: PermissionScope[];
}

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "domain_error",
    public details?: unknown,
  ) {
    super(message);
  }
}

export const SENSITIVE_FIELD_GROUPS = {
  cost: ["estimatedHpp", "actualHpp", "markup", "fxRate", "internalCost", "makloonCost", "avgCost", "lastPrice", "unitPrice", "total"],
  salary: ["salaryLevel"],
  collection: ["collectionNotes"],
} as const;
