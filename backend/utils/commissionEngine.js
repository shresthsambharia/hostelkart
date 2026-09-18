import Settings from '../models/Settings.js';
import FinancialLedger from '../models/FinancialLedger.js';
import User from '../models/User.js';

export const DEFAULT_MARKETPLACE_SETTINGS = {
  globalCommissionPercentage: 10,
  categoryCommissionPercentages: {
    Fruits: 10,
    Medicines: 10,
    Stationery: 10,
    'Exotic Fruits': 10,
    'Clothes Essentials': 10,
  },
  minPayoutThreshold: 1000,
  settlementFrequency: 'Manual',
  settlementMethod: 'UPI',
  businessName: 'HostelKart Marketplace',
  upiId: 'hostelkart@upi',
  qrCodeImage: '',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  instructions: 'Settlements processed manually via UPI / IMPS upon order delivery verification.',
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
 * Resolve commission rate according to strict business priority:
 * 1. Supplier-specific override
 * 2. Category-specific override
 * 3. Global platform rate
 */
export function resolveCommissionRate(product, supplierUser, settings) {
  // Priority 1: Supplier-level override
  if (
    supplierUser &&
    supplierUser.supplierDetails &&
    typeof supplierUser.supplierDetails.commissionPercentage === 'number' &&
    supplierUser.supplierDetails.commissionPercentage >= 0
  ) {
    return supplierUser.supplierDetails.commissionPercentage;
  }

  // Priority 2: Category-level override
  if (
    product &&
    product.category &&
    settings.categoryCommissionPercentages &&
    typeof settings.categoryCommissionPercentages[product.category] === 'number' &&
    settings.categoryCommissionPercentages[product.category] >= 0
  ) {
    return settings.categoryCommissionPercentages[product.category];
  }

  // Priority 3: Global rate
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
