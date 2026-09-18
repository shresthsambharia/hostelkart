import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import FinancialLedger from '../models/FinancialLedger.js';
import SupplierPayout from '../models/SupplierPayout.js';
import {
  getSupplierDashboard,
  getSupplierProducts,
  getSupplierProductById,
  createSupplierProduct,
  updateSupplierProduct,
  updateSupplierProductStock,
  deleteSupplierProduct,
  getSupplierOrders,
  getSupplierProfile,
  updateSupplierProfile,
  updateSupplierOrderItemStatus,
  getSupplierFinance,
  getSupplierLedger,
  getSettlementStatement,
} from '../controllers/supplierController.js';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  getAdminSupplierProducts,
  updateSupplierProductApproval,
  updateSupplierCommission,
  createSupplierPayout,
  updateSupplierPayoutStatus,
  getAdminSupplierPayouts,
} from '../controllers/adminController.js';
import { getProducts, getProductById } from '../controllers/productController.js';
import {
  resolveCommissionRate,
  calculateItemCommissionSnapshot,
  processOrderDeliverySettlement,
} from '../utils/commissionEngine.js';

export async function runSupplierTests() {
  console.log('\n--- Running Supplier Unit & Integration Tests ---');

  // Pre-cleanup stale test products if any
  await Product.deleteMany({ name: 'Organic Shimla Apples (1kg)' });

  // 1. Setup Test Users
  let supplier1 = await User.findOne({ email: 'supplier_test_1@example.com' });
  if (!supplier1) {
    supplier1 = await User.create({
      name: 'Fresh Farm Supplier',
      email: 'supplier_test_1@example.com',
      password: 'password123',
      role: 'supplier',
      phone: '9876543210',
      supplierDetails: {
        businessName: 'Fresh Farms Pvt Ltd',
        category: 'Fruits',
      },
    });
  }

  let supplier2 = await User.findOne({ email: 'supplier_test_2@example.com' });
  if (!supplier2) {
    supplier2 = await User.create({
      name: 'Stationery World Supplier',
      email: 'supplier_test_2@example.com',
      password: 'password123',
      role: 'supplier',
      phone: '9876543211',
      supplierDetails: {
        businessName: 'Stationery World',
        category: 'Stationery',
      },
    });
  }

  let student = await User.findOne({ email: 'student_for_supplier_test@example.com' });
  if (!student) {
    student = await User.create({
      name: 'Test Student',
      email: 'student_for_supplier_test@example.com',
      password: 'password123',
      role: 'student',
    });
  }

  let admin = await User.findOne({ email: 'admin_for_supplier_test@example.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Test Admin',
      email: 'admin_for_supplier_test@example.com',
      password: 'password123',
      role: 'admin',
    });
  }

  // Pre-cleanup any previous test orders, ledgers, payouts
  await Order.deleteMany({ 'items.supplier': supplier1._id });
  await FinancialLedger.deleteMany({ supplier: supplier1._id });
  await SupplierPayout.deleteMany({ supplier: supplier1._id });

  console.log('✓ Users setup completed');

  // 2. Test Supplier Product Creation (Must default to pending approval & isAvailable: false)
  let createdProduct = null;
  const mockCreateReq = {
    user: supplier1,
    body: {
      name: 'Organic Shimla Apples (1kg)',
      price: 140,
      description: 'Crisp, sweet, directly sourced Shimla apples',
      image: 'https://res.cloudinary.com/test/image/upload/apples.jpg',
      category: 'Fruits',
      stock: 50,
      brand: 'Shimla Fresh',
      mrp: 160,
      discount: 12,
    },
  };

  const mockCreateRes = {
    status(code) {
      assert.strictEqual(code, 201, 'Expected status 201 on creation');
      return this;
    },
    json(data) {
      assert.ok(data.product, 'Expected product in response');
      assert.strictEqual(data.product.name, 'Organic Shimla Apples (1kg)');
      assert.strictEqual(data.product.approvalStatus, 'pending', 'Product must default to pending approval');
      assert.strictEqual(data.product.isAvailable, false, 'Product must default to inactive until approved');
      assert.strictEqual(data.product.supplier.toString(), supplier1._id.toString(), 'Supplier ID must match');
      createdProduct = data.product;
    },
  };

  await createSupplierProduct(mockCreateReq, mockCreateRes);
  console.log('✓ Supplier product creation with pending approval verified');

  // 3. Test Student Isolation: Pending product MUST NOT be returned in student catalog
  const mockStudentReq = {
    user: student,
    query: { keyword: 'Organic Shimla Apples' },
  };

  const mockStudentRes = {
    setHeader() {},
    json(products) {
      const found = products.find((p) => p._id.toString() === createdProduct._id.toString());
      assert.strictEqual(found, undefined, 'Pending supplier product must NOT appear in student catalog');
    },
  };

  await getProducts(mockStudentReq, mockStudentRes);
  console.log('✓ Pending supplier product hidden from student catalog verified');

  // 4. Test Single Product Access for Student: Must throw 404 for pending product
  let caught404 = false;
  try {
    const mockStudentGetByIdReq = {
      user: student,
      params: { id: createdProduct._id.toString() },
    };
    const mockStudentGetByIdRes = {
      setHeader() {},
      json() {},
    };
    await getProductById(mockStudentGetByIdReq, mockStudentGetByIdRes);
  } catch (err) {
    caught404 = true;
  }
  assert.ok(caught404, 'Student accessing pending product directly must receive 404');
  console.log('✓ Direct student access to pending product blocked (404) verified');

  // 5. Test IDOR Protection: Supplier 2 CANNOT access Supplier 1's product
  let idorBlocked = false;
  try {
    const mockIdorReq = {
      user: supplier2,
      params: { id: createdProduct._id.toString() },
    };
    const mockIdorRes = {
      json() {},
    };
    await getSupplierProductById(mockIdorReq, mockIdorRes);
  } catch (err) {
    idorBlocked = true;
  }
  assert.ok(idorBlocked, 'Supplier 2 must NOT be able to view Supplier 1 product');

  let idorUpdateBlocked = false;
  try {
    const mockIdorUpdateReq = {
      user: supplier2,
      params: { id: createdProduct._id.toString() },
      body: { name: 'Hacked Product Name' },
    };
    const mockIdorUpdateRes = {
      json() {},
    };
    await updateSupplierProduct(mockIdorUpdateReq, mockIdorUpdateRes);
  } catch (err) {
    idorUpdateBlocked = true;
  }
  assert.ok(idorUpdateBlocked, 'Supplier 2 must NOT be able to update Supplier 1 product');

  let idorDeleteBlocked = false;
  try {
    const mockIdorDeleteReq = {
      user: supplier2,
      params: { id: createdProduct._id.toString() },
    };
    const mockIdorDeleteRes = {
      json() {},
    };
    await deleteSupplierProduct(mockIdorDeleteReq, mockIdorDeleteRes);
  } catch (err) {
    idorDeleteBlocked = true;
  }
  assert.ok(idorDeleteBlocked, 'Supplier 2 must NOT be able to delete Supplier 1 product');
  console.log('✓ IDOR security protection between suppliers verified');

  // 6. Test Admin Product Approval Workflow
  const mockAdminApproveReq = {
    user: admin,
    params: { id: createdProduct._id.toString() },
    body: { approvalStatus: 'approved', isAvailable: true },
  };

  const mockAdminApproveRes = {
    json(data) {
      assert.strictEqual(data.product.approvalStatus, 'approved');
      assert.strictEqual(data.product.isAvailable, true);
    },
  };

  await updateSupplierProductApproval(mockAdminApproveReq, mockAdminApproveRes);
  console.log('✓ Admin product approval verified');

  // 7. Test Student Access After Approval: Must now appear in student catalog
  const mockStudentReq2 = {
    user: student,
    query: { keyword: 'Organic Shimla Apples' },
  };

  const mockStudentRes2 = {
    setHeader() {},
    json(products) {
      const found = products.find((p) => p._id.toString() === createdProduct._id.toString());
      assert.ok(found, 'Approved supplier product in visible category MUST appear in student catalog');
    },
  };

  await getProducts(mockStudentReq2, mockStudentRes2);
  console.log('✓ Approved supplier product visible in student catalog verified');

  // 8. Test Supplier Stock Management
  const mockStockReq = {
    user: supplier1,
    params: { id: createdProduct._id.toString() },
    body: { stock: 25 },
  };

  const mockStockRes = {
    json(data) {
      assert.strictEqual(data.product.stock, 25);
    },
  };

  await updateSupplierProductStock(mockStockReq, mockStockRes);
  console.log('✓ Supplier stock update verified');

  // 9. Test Supplier Dashboard Metrics
  const mockDashReq = { user: supplier1 };
  const mockDashRes = {
    json(data) {
      assert.ok(data.metrics, 'Dashboard metrics returned');
      assert.strictEqual(data.metrics.totalProducts >= 1, true);
      assert.strictEqual(data.metrics.approvedProducts >= 1, true);
      assert.strictEqual(data.metrics.totalStockUnits >= 25, true);
    },
  };

  await getSupplierDashboard(mockDashReq, mockDashRes);
  console.log('✓ Supplier dashboard analytics verified');

  // 10. Test Commission Rate Hierarchy Resolution
  const mockSettings = {
    globalCommissionPercentage: 10,
    categoryCommissionPercentages: {
      Fruits: 15,
      Medicines: 8,
      Stationery: 12,
      'Exotic Fruits': 20,
      'Clothes Essentials': 14,
    },
  };

  // Case A: Global default fallback (no category match, no supplier override)
  const defaultRate = resolveCommissionRate({ category: 'Other' }, { supplierDetails: {} }, mockSettings);
  assert.strictEqual(defaultRate, 10, 'Should fall back to global default 10%');

  // Case B: Category override (Fruits = 15%)
  const categoryRate = resolveCommissionRate({ category: 'Fruits' }, { supplierDetails: {} }, mockSettings);
  assert.strictEqual(categoryRate, 15, 'Should use category override 15%');

  // Case C: Supplier-specific override takes top precedence (e.g. 7%)
  const supplierOverrideRate = resolveCommissionRate(
    { category: 'Fruits' },
    { supplierDetails: { commissionPercentage: 7 } },
    mockSettings
  );
  assert.strictEqual(supplierOverrideRate, 7, 'Supplier override must take precedence over category rate');
  console.log('✓ Commission hierarchy resolution verified (Supplier > Category > Global)');

  // 11. Test Exact Integer Paise Calculation Snapshot
  const snapshot = calculateItemCommissionSnapshot(
    { price: 250, discount: 10, supplier: supplier1._id, category: 'Fruits' },
    supplier1,
    mockSettings,
    2
  );
  // price 250 with 10% discount = 225. Qty = 2 => gross = 450.00
  assert.strictEqual(snapshot.grossAmount, 450);
  // Supplier 1 has no override so Fruits rate 15% applies => 450 * 0.15 = 67.50
  assert.strictEqual(snapshot.commissionRate, 15);
  assert.strictEqual(snapshot.commissionAmount, 67.5);
  // supplier payable = 450 - 67.50 = 382.50
  assert.strictEqual(snapshot.supplierPayableAmount, 382.5);
  console.log('✓ Precise paise snapshot arithmetic verified');

  // 12. Test Order Creation with Supplier Item Snapshots & Delivery Settlement
  const testOrder = await Order.create({
    user: student._id,
    items: [
      {
        product: createdProduct._id,
        name: 'Organic Shimla Apples (1kg)',
        price: 140,
        quantity: 2,
        image: 'https://res.cloudinary.com/test/image/upload/apples.jpg',
        supplier: supplier1._id,
        grossAmount: 280,
        commissionRate: 10,
        commissionAmount: 28,
        supplierPayableAmount: 252,
        itemStatus: 'Pending',
        settlementStatus: 'Pending',
      },
    ],
    deliveryDetails: {
      hostelName: 'BH-1',
      block: 'A',
      floor: '2',
      roomNumber: '204',
      phone: '9876543210',
    },
    deliverySlot: 'Immediate (10-20 mins)',
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
    totalAmount: 280,
    itemsPrice: 280,
    deliveryCharge: 0,
    platformFee: 0,
    orderStatus: 'Confirmed',
  });

  // 13. Test Delivery Settlement Trigger & Financial Ledger Generation
  testOrder.orderStatus = 'Delivered';
  await processOrderDeliverySettlement(testOrder, admin);
  await testOrder.save();

  // Verify item settlement status transitioned to 'Eligible'
  assert.strictEqual(testOrder.items[0].settlementStatus, 'Eligible');

  // Verify Ledger entries created for Supplier 1 (SALE credit + COMMISSION debit)
  const ledgerEntries = await FinancialLedger.find({ order: testOrder._id, supplier: supplier1._id });
  assert.strictEqual(ledgerEntries.length, 2, 'Must have SALE and COMMISSION ledger entries');
  const saleEntry = ledgerEntries.find((e) => e.type === 'SALE');
  const commEntry = ledgerEntries.find((e) => e.type === 'COMMISSION');
  assert.ok(saleEntry && saleEntry.direction === 'CREDIT' && saleEntry.amount === 280);
  assert.ok(commEntry && commEntry.direction === 'DEBIT' && commEntry.amount === 28);
  console.log('✓ Delivery settlement and immutable ledger entry generation verified');

  // 14. Test Supplier Finance API
  const mockFinanceReq = { user: supplier1 };
  let financeData = null;
  const mockFinanceRes = {
    json(data) {
      assert.ok(data.metrics, 'Finance metrics returned');
      assert.strictEqual(data.metrics.totalDeliveredGross >= 280, true);
      assert.strictEqual(data.metrics.totalDeliveredCommission >= 28, true);
      assert.strictEqual(data.metrics.totalDeliveredPayable >= 252, true);
      financeData = data;
    },
  };
  await getSupplierFinance(mockFinanceReq, mockFinanceRes);
  console.log('✓ Supplier finance metrics calculation verified');

  // 15. Test Admin Supplier Payout Generation
  const mockCreatePayoutReq = {
    user: admin,
    body: {
      supplierId: supplier1._id.toString(),
      paymentMethod: 'UPI',
      notes: 'Weekly batch settlement test',
    },
  };
  let createdPayout = null;
  const mockCreatePayoutRes = {
    status(code) {
      assert.strictEqual(code, 201);
      return this;
    },
    json(data) {
      assert.ok(data.payout, 'Payout batch created');
      assert.strictEqual(data.payout.status, 'Pending');
      assert.strictEqual(data.payout.netPayable, 252);
      createdPayout = data.payout;
    },
  };
  await createSupplierPayout(mockCreatePayoutReq, mockCreatePayoutRes);

  // Check that order item status is now 'Processing'
  const refreshedOrder = await Order.findById(testOrder._id);
  assert.strictEqual(refreshedOrder.items[0].settlementStatus, 'Processing');
  console.log('✓ Admin payout batch creation & item transition to Processing verified');

  // 16. Test Admin Payout Status Update to 'Paid' with UTR
  const mockUpdatePayoutReq = {
    user: admin,
    params: { id: createdPayout._id.toString() },
    body: {
      status: 'Paid',
      utrNumber: 'UTR998877665544',
      payoutProofUrl: 'https://res.cloudinary.com/test/receipt.pdf',
    },
  };
  const mockUpdatePayoutRes = {
    json(data) {
      assert.strictEqual(data.payout.status, 'Paid');
      assert.strictEqual(data.payout.utrNumber, 'UTR998877665544');
    },
  };
  await updateSupplierPayoutStatus(mockUpdatePayoutReq, mockUpdatePayoutRes);

  // Verify item settlement status is now 'Settled'
  const settledOrder = await Order.findById(testOrder._id);
  assert.strictEqual(settledOrder.items[0].settlementStatus, 'Settled');

  // Verify PAYOUT debit written to ledger
  const payoutLedger = await FinancialLedger.findOne({ payout: createdPayout._id, type: 'PAYOUT' });
  assert.ok(payoutLedger, 'PAYOUT ledger entry must be created on mark as Paid');
  assert.strictEqual(payoutLedger.direction, 'DEBIT');
  assert.strictEqual(payoutLedger.amount, 252);
  console.log('✓ Payout mark-as-paid with UTR, Settled state and PAYOUT ledger entry verified');

  // 17. Clean up test data
  await Product.deleteOne({ _id: createdProduct._id });
  await Order.deleteOne({ _id: testOrder._id });
  await SupplierPayout.deleteOne({ _id: createdPayout._id });
  await FinancialLedger.deleteMany({ supplier: supplier1._id });
  console.log('✓ Cleanup completed');
  console.log('--- ALL SUPPLIER & FINANCIAL TESTS PASSED ---\n');
}
