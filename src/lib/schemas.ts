import { z } from "zod";

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional(),
);
const dateString = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const buyerCreateSchema = z.object({
  kode: z.string().trim().min(1),
  nama: z.string().trim().min(1),
  company: nullableString,
  country: nullableString,
  defaultShipping: nullableString,
  status: z.enum(["PROSPECT", "ACTIVE", "HOLD", "BLACKLIST"]).default("PROSPECT"),
  holdReason: nullableString,
  cmoOwnerId: nullableString,
});

export const buyerUpdateSchema = buyerCreateSchema.partial().extend({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const orderCreateSchema = z.object({
  entityId: z.string().min(1),
  buyerId: z.string().min(1),
  tipe: z.enum(["SAMPLE", "PRODUCTION", "SAMPLE_PRODUCTION"]),
  tanggalOrder: dateString,
  deadline: dateString.optional().nullable(),
  currency: z.string().trim().min(3).max(3).default("IDR"),
  fxRate: z.coerce.number().positive().optional().nullable(),
  fxRateDate: dateString.optional().nullable(),
  fxSource: nullableString,
  commercialValue: z.coerce.number().nonnegative().optional().nullable(),
  baseCommercialValue: z.coerce.number().nonnegative().optional().nullable(),
  paymentTermId: nullableString,
  cmoPicId: nullableString,
  isRepeat: z.boolean().default(false),
  sourceOrderId: nullableString,
});

export const orderUpdateSchema = orderCreateSchema.partial().extend({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const articleCreateSchema = z.object({
  orderId: z.string().min(1),
  nama: z.string().trim().min(1),
  garmentTypeId: nullableString,
  colorId: nullableString,
  mockupVersion: nullableString,
  qty: z.coerce.number().int().positive(),
  sampleRequired: z.boolean().default(false),
  deadline: dateString.optional().nullable(),
  businessPriority: z.coerce.number().int().min(1).max(5).default(3),
  sizes: z.array(z.object({ sizeId: z.string().min(1), qty: z.coerce.number().int().min(0) })).min(1),
});

export const priorityUpdateSchema = z.object({
  businessPriority: z.coerce.number().int().min(1).max(5),
  version: z.number().int().min(0),
  reason: z.string().trim().optional(),
});

export const batchCreateSchema = z.object({
  articleId: z.string().min(1),
  parentBatchId: nullableString,
  plannedQty: z.coerce.number().int().positive(),
  locationId: nullableString,
});

export const releaseSchema = z.object({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const quotationCreateSchema = z.object({
  buyerId: nullableString,
  orderId: nullableString,
  articleId: nullableString,
  currency: z.string().trim().min(3).max(3).default("IDR"),
  estimatedHpp: z.coerce.number().nonnegative().optional().nullable(),
  markupPercent: z.coerce.number().nonnegative().optional().nullable(),
  offeredPrice: z.coerce.number().nonnegative().optional().nullable(),
  baseOfferedPrice: z.coerce.number().nonnegative().optional().nullable(),
  validUntil: dateString.optional().nullable(),
  notes: nullableString,
});

export const quotationStatusSchema = z.object({
  status: z.enum(["SENT", "APPROVED", "REJECTED", "EXPIRED"]),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const pricingConfigSchema = z.object({
  markupMode: z.enum(["MARKUP_ON_COST", "MARGIN_ON_PRICE"]),
  markupPercent: z.coerce.number().positive().max(99),
});

export const productionHandoffCreateSchema = z.object({
  batchId: nullableString,
  fromProcess: nullableString,
  toProcess: nullableString,
  fromLocationId: nullableString,
  toLocationId: nullableString,
  qtySent: z.coerce.number().int().nonnegative(),
  notes: nullableString,
});

export const productionHandoffReceiveSchema = z.object({
  qtyReceived: z.coerce.number().int().nonnegative(),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const qcInspectionCreateSchema = z.object({
  batchId: nullableString,
  articleId: nullableString,
  sizeId: nullableString,
  inspectedQty: z.coerce.number().int().nonnegative(),
  passQty: z.coerce.number().int().nonnegative(),
  rejectQty: z.coerce.number().int().nonnegative(),
  rejectCategoryId: nullableString,
  notes: nullableString,
});

export const qcDecisionSchema = z.object({
  status: z.enum(["PASS", "REJECT", "REWORK"]),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const packingJobCreateSchema = z.object({
  batchId: nullableString,
  articleId: nullableString,
  qtyToPack: z.coerce.number().int().nonnegative(),
  labelCode: nullableString,
  notes: nullableString,
});

export const packingStatusSchema = z.object({
  status: z.enum(["PACKED", "GOODS_READY"]),
  packedQty: z.coerce.number().int().nonnegative(),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const procurementRequestCreateSchema = z.object({
  articleId: nullableString,
  materialId: z.string().min(1),
  qtyNeeded: z.coerce.number().positive(),
  uom: z.string().trim().min(1),
  neededBy: dateString.optional().nullable(),
  approverRole: nullableString,
  reason: nullableString,
});

export const procurementStatusSchema = z.object({
  status: z.enum(["APPROVED", "CANCELLED"]),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const purchaseOrderCreateSchema = z.object({
  procurementRequestId: z.string().min(1),
  supplierId: z.string().min(1),
  currency: z.string().trim().min(3).max(3).default("IDR"),
  total: z.coerce.number().nonnegative().optional().nullable(),
  orderedAt: dateString.optional().nullable(),
  expectedAt: dateString.optional().nullable(),
  notes: nullableString,
});

export const goodsReceiptCreateSchema = z.object({
  purchaseOrderId: z.string().min(1),
  materialId: z.string().min(1),
  warehouseId: z.string().min(1),
  qtyReceived: z.coerce.number().positive(),
  uom: z.string().trim().min(1),
  receivedAt: dateString.optional().nullable(),
  notes: nullableString,
});

export const inventoryIssueSchema = z.object({
  materialId: z.string().min(1),
  warehouseId: z.string().min(1),
  qtyOut: z.coerce.number().positive(),
  sourceType: nullableString,
  sourceId: nullableString,
  notes: nullableString,
});

export const stockOpnameCreateSchema = z.object({
  materialId: z.string().min(1),
  warehouseId: z.string().min(1),
  countedQty: z.coerce.number().nonnegative(),
  evidenceUrl: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  countedAt: dateString.optional().nullable(),
});

export const stockOpnameDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1),
});

export const stockOpnameApplySchema = z.object({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const invoiceCreateSchema = z.object({
  orderId: nullableString,
  buyerId: nullableString,
  currency: z.string().trim().min(3).max(3).default("IDR"),
  amount: z.coerce.number().positive(),
  baseAmount: z.coerce.number().nonnegative().optional().nullable(),
  dueDate: dateString,
  issuedAt: dateString.optional().nullable(),
  collectionNotes: nullableString,
});

export const invoiceVoidSchema = z.object({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1),
});

export const paymentReportSchema = z.object({
  invoiceId: z.string().min(1),
  currency: z.string().trim().min(3).max(3).default("IDR"),
  amount: z.coerce.number().positive(),
  reportedAt: dateString.optional().nullable(),
  evidenceUrl: z.string().trim().min(1),
  notes: nullableString,
});

export const paymentDecisionSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1),
});

export const shipmentCreateSchema = z.object({
  orderId: z.string().min(1),
  carrierId: nullableString,
  packingJobId: z.string().min(1),
  packedQty: z.coerce.number().int().positive(),
  scheduledAt: dateString.optional().nullable(),
  trackingNo: nullableString,
  notes: nullableString,
});

export const shipmentStatusSchema = z.object({
  status: z.enum(["SHIPPED", "DELIVERED"]),
  version: z.number().int().min(0),
  trackingNo: nullableString,
  reason: z.string().trim().min(1).optional(),
});

export const shipmentExceptionReleaseSchema = z.object({
  exceptionId: z.string().min(1),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1),
});

export const portalAccountCreateSchema = z.object({
  buyerId: z.string().min(1),
  buyerContactId: nullableString,
  email: z.string().trim().email(),
  password: z.string().min(6),
  portalRole: z.enum(["APPROVER", "FINANCE", "SHIPPING", "VIEWER"]).default("VIEWER"),
});

export const portalLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const portalTicketCreateSchema = z.object({
  orderId: nullableString,
  subject: z.string().trim().min(1),
  message: nullableString,
});

export const portalTicketStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "CLOSED"]),
  version: z.number().int().min(0),
});

export const portalPaymentEvidenceSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  evidenceUrl: z.string().trim().min(1),
  notes: nullableString,
});

export const portalSampleDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const crmPipelineCreateSchema = z.object({
  buyerId: nullableString,
  title: z.string().trim().min(1),
  stage: z.string().trim().min(1).default("LEAD"),
  nextFollowUp: dateString.optional().nullable(),
  ownerId: nullableString,
  notes: nullableString,
});

export const crmPipelineUpdateSchema = crmPipelineCreateSchema.partial().extend({
  version: z.number().int().min(0),
  reason: z.string().trim().min(1).optional(),
});

export const sampleApprovalCreateSchema = z.object({
  articleId: nullableString,
  buyerId: nullableString,
  sentAt: dateString.optional().nullable(),
  notes: nullableString,
});

export const sampleApprovalStatusSchema = z.object({
  status: z.enum(["SENT", "APPROVED", "REJECTED"]),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const makloonJobCreateSchema = z.object({
  batchId: z.string().min(1),
  supplierId: z.string().min(1),
  processId: nullableString,
  unitPrice: z.coerce.number().nonnegative().optional().nullable(),
  total: z.coerce.number().nonnegative().optional().nullable(),
  qtySent: z.coerce.number().int().nonnegative(),
  dueDate: dateString.optional().nullable(),
  notes: nullableString,
});

export const makloonStatusSchema = z.object({
  status: z.enum(["SENT", "RECEIVED", "CLOSED"]),
  qtyReceived: z.coerce.number().int().nonnegative().optional(),
  version: z.number().int().min(0),
  notes: nullableString,
});

export const employeeCreateSchema = z.object({
  userId: nullableString,
  nik: nullableString,
  nama: z.string().trim().min(1),
  departemen: nullableString,
  roleTitle: nullableString,
  salaryLevel: nullableString,
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const manpowerPlanCreateSchema = z.object({
  tanggal: dateString,
  departemen: z.string().trim().min(1),
  plannedPeople: z.coerce.number().int().nonnegative(),
  actualPeople: z.coerce.number().int().nonnegative().optional().nullable(),
  notes: nullableString,
});

export const revisionCreateSchema = z.object({
  judul: z.string().trim().min(3).max(160),
  modul: z.string().trim().min(1).max(80),
  deskripsi: z.string().trim().min(5).max(6000),
  prioritas: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  checklist: z.array(z.string().trim().min(1).max(240)).min(1).max(20),
  imageData: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/i).max(14000000).optional().nullable(),
  imageName: nullableString,
  imageMime: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"]).optional().nullable(),
});

export const revisionUpdateSchema = z.object({
  status: z.enum(["OPEN", "DONE"]).optional(),
  version: z.number().int().min(0),
  checklist: z.array(z.object({ id: z.string().min(1), isDone: z.boolean() })).max(20).optional(),
  reason: z.string().trim().min(1).optional(),
});

export const taskCreateSchema = z.object({
  sourceEntitas: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  tipe: z.string().trim().min(1),
  judul: z.string().trim().min(1),
  deskripsi: nullableString,
  assigneeId: nullableString,
  assigneeRole: nullableString,
  due: dateString.optional().nullable(),
  prioritas: z.coerce.number().int().min(1).max(5).default(3),
});

export const taskUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED", "OVERDUE"]).optional(),
  assigneeId: nullableString,
  assigneeRole: nullableString,
  due: dateString.optional().nullable(),
  prioritas: z.coerce.number().int().min(1).max(5).optional(),
  version: z.number().int().min(0),
  reason: z.string().trim().min(1),
});

export const exceptionCreateSchema = z.object({
  tipe: z.enum([
    "SHIPMENT_OUTSTANDING",
    "PRICE_BELOW_MINIMUM",
    "NEW_BUYER_CONTRACT",
    "MAJOR_INVENTORY_ADJUSTMENT",
    "CUSTOMER_RISK_COMPENSATION",
    "CRITICAL_PEOPLE_ISSUE",
    "CROSS_DEPT_DEADLOCK",
    "INVESTMENT_EXPANSION",
    "MAJOR_CASH_PURCHASE",
  ]),
  sourceModul: z.string().trim().min(1),
  referensiId: nullableString,
  masalah: z.string().trim().min(1),
  dampak: z.string().trim().min(1),
  rekomendasi: nullableString,
  decisionOwnerRole: z.string().trim().min(1),
  evidenceUrls: z.array(z.string().url()).default([]),
});

export const decisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  keputusan: z.string().trim().min(1),
  alasan: z.string().trim().min(1),
  version: z.number().int().min(0),
});

export const masterCreateSchema = z.record(z.unknown());
export const masterUpdateSchema = z.record(z.unknown()).and(z.object({ version: z.number().int().min(0).optional(), reason: z.string().optional() }));
