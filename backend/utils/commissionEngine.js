import Settings from '../models/Settings.js';
import FinancialLedger from '../models/FinancialLedger.js';
import User from '../models/User.js';

export const DEFAULT_MARKETPLACE_SETTINGS = {
  globalCommissionPercentage: 10,
  categoryCommissionPercentages: {
    Fruits: 10,
    Medicines: 5,
    Stationery: 5,
    'Exotic Fruits': 10,
    'Clothes Essentials': 10,
  },
  minPayoutThreshold: 500,
  payoutDay: 'Saturday',
  maxSettlementDays: 10,
  settlementFrequency: 'Weekly (Saturday)',
  settlementMethod: 'UPI QR',
  businessName: 'HostelKart Marketplace',
  upiId: 'hostelkart@upi',
  qrCodeImage: '',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  instructions: 'Settlements processed manually via supplier UPI QR scan upon weekly Saturday payout cycle.',
};

/**
 * Get current platform marketplace & settlement settings with robust defaults
 */
export async function getMarketplaceSettings() {
  try {
    const settingDoc = await Settings.findOne({ key: 'marketplace_settlement_settings' }).lean();
    if (settingDoc && settingDoc.value) {
      return {
        ...DEFAULT_MARKETPLACE_SETTINGS,
        ...settingDoc.value,
        categoryCommissionPercentages: {
          ...DEFAULT_MARKETPLACE_SETTINGS.categoryCommissionPercentages,
          ...(settingDoc.value.categoryCommissionPercentages || {}),
        },
      };
    }
  } catch (err) {
    console.error('Failed to load marketplace settlement settings:', err.message);
  }
  return DEFAULT_MARKETPLACE_SETTINGS;
}

/**
 * Calculate settlement due date from delivery date
 */
export function calculateSettlementDueDate(deliveryDate, maxDays = 10) {
  const base = deliveryDate ? new Date(deliveryDate) : new Date();
  return new Date(base.getTime() + maxDays * 24 * 60 * 60 * 1000);
}

/**
 * Check if an item/order is overdue for payout
 */
export function isSettlementOverdue(deliveryDate, maxDays = 10) {
  if (!deliveryDate) return false;
  const dueDate = calculateSettlementDueDate(deliveryDate, maxDays);
  return Date.now() > dueDate.getTime();
}

/**
 * Calculate next payout day date (Default: Saturday)
 */
export function getNextPayoutDate(targetDay = 'Saturday') {
  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const targetDayNum = dayMap[targetDay] !== undefined ? dayMap[targetDay] : 6;
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDayNum - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  const nextDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

/**
 * Resolve commission rate according to strict 4-tier business priority:
 * 1. Product-specific override (e.g. Special fruit at 12%)
 * 2. Supplier-specific override
 * 3. Category-specific override (Fruits 10%, Medicines 5%, Stationery 5%, etc.)
 * 4. Global platform default rate (10%)
 */
export function resolveCommissionRate(product, supplierUser, settings = DEFAULT_MARKETPLACE_SETTINGS) {
  // Priority 1: Product-level override
  if (
    product &&
    typeof product.commissionPercentage === 'number' &&
    product.commissionPercentage >= 0
  ) {
    return product.commissionPercentage;
  }

  // Priority 2: Supplier-level override
  if (
    supplierUser &&
    supplierUser.supplierDetails &&
    typeof supplierUser.supplierDetails.commissionPercentage === 'number' &&
    supplierUser.supplierDetails.commissionPercentage >= 0
  ) {
    return supplierUser.supplierDetails.commissionPercentage;
  }

  // Priority 3: Category-level override
  if (
    product &&
    product.category &&
    settings.categoryCommissionPercentages &&
    typeof settings.categoryCommissionPercentages[product.category] === 'number' &&
    settings.categoryCommissionPercentages[product.category] >= 0
  ) {
    return settings.categoryCommissionPercentages[product.category];
  }

  // Priority 4: Global rate
  return typeof settings.globalCommissionPercentage === 'number'
    ? settings.globalCommissionPercentage
    : DEFAULT_MARKETPLACE_SETTINGS.globalCommissionPercentage;
}

/**
 * Calculate money values safely using minor units (paise) to prevent floating-point inaccuracies
 */
export function calculateItemCommissionSnapshot(product, supplierUser, settings, quantity = 1) {
  if (!product.supplier) {
    // Platform owned item (no third-party supplier)
    const itemPrice = Number(product.price) || 0;
    const itemDiscount = Number(product.discount) || 0;
    const effectivePrice = Math.max(0, itemPrice - (itemPrice * itemDiscount) / 100);
    const grossAmount = Math.round(effectivePrice * quantity * 100) / 100;
    return {
      supplier: null,
      commissionRate: 0,
      grossAmount,
      commissionAmount: 0,
      supplierPayableAmount: 0,
    };
  }

  const rate = resolveCommissionRate(product, supplierUser, settings);
  const itemPrice = Number(product.price) || 0;
  const itemDiscount = Number(product.discount) || 0;
  const effectivePrice = Math.max(0, itemPrice - (itemPrice * itemDiscount) / 100);

  // Integer minor units math (Paise)
  const grossPaise = Math.round(effectivePrice * quantity * 100);
  const commissionPaise = Math.round((grossPaise * rate) / 100);
  const supplierPayablePaise = Math.max(0, grossPaise - commissionPaise);

  return {
    supplier: supplierUser ? supplierUser._id : product.supplier,
    commissionRate: rate,
    grossAmount: grossPaise / 100,
    commissionAmount: commissionPaise / 100,
    supplierPayableAmount: supplierPayablePaise / 100,
  };
}

/**
 * Append immutable entry to Financial Ledger
 */
export async function recordLedgerEntry({
  supplier,
  order = null,
  payout = null,
  type,
  amount,
  direction,
  description = '',
  reference = '',
  createdBy = null,
}) {
  if (!supplier || !type || amount === undefined || !direction) {
    throw new Error('Missing required fields for financial ledger recording');
  }

  const roundedAmount = Math.round(Number(amount) * 100) / 100;
  if (roundedAmount <= 0) return null;

  return await FinancialLedger.create({
    supplier,
    order,
    payout,
    type,
    amount: roundedAmount,
    direction,
    description,
    reference,
    createdBy,
  });
}

/**
 * Settle delivered order items and create financial ledger records
 */
export async function processOrderDeliverySettlement(order, actorUser = null) {
  if (!order || !order.items || order.items.length === 0) return;

  for (const item of order.items) {
    if (item.supplier && item.settlementStatus === 'Pending') {
      item.settlementStatus = 'Eligible';
      item.itemStatus = 'Delivered';

      // Record Gross Sale Credit for supplier
      await recordLedgerEntry({
        supplier: item.supplier,
        order: order._id,
        type: 'SALE',
        amount: item.grossAmount || (item.price * item.quantity),
        direction: 'CREDIT',
        description: `Gross sale for "${item.name}" (Order #${order._id.toString().substring(12).toUpperCase()})`,
        reference: order._id.toString(),
        createdBy: actorUser?._id || null,
      });

      // Record Commission Debit for supplier
      if (item.commissionAmount > 0) {
        await recordLedgerEntry({
          supplier: item.supplier,
          order: order._id,
          type: 'COMMISSION',
          amount: item.commissionAmount,
          direction: 'DEBIT',
          description: `HostelKart commission (${item.commissionRate}%) for "${item.name}" (Order #${order._id.toString().substring(12).toUpperCase()})`,
          reference: order._id.toString(),
          createdBy: actorUser?._id || null,
        });
      }
    }
  }
}
