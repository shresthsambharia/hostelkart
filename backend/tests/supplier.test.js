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

  // 10. Test Commission Rate Hierarchy Resolution (4-Tier: Product -> Supplier -> Category -> Global)
  const mockSettings = {
    globalCommissionPercentage: 10,
    categoryCommissionPercentages: {
      Fruits: 10,
      Medicines: 5,
      Stationery: 5,
      'Exotic Fruits': 10,
      'Clothes Essentials': 10,
    },
  };

  // Tier 4: Global default fallback (no category match, no supplier override, no product override)
  const defaultRate = resolveCommissionRate({ category: 'Other' }, { supplierDetails: {} }, mockSettings);
  assert.strictEqual(defaultRate, 10, 'Should fall back to global default 10%');

  // Tier 3: Category override (Fruits = 10%, Medicines = 5%)
  const fruitCategoryRate = resolveCommissionRate({ category: 'Fruits' }, { supplierDetails: {} }, mockSettings);
  assert.strictEqual(fruitCategoryRate, 10, 'Should use category override 10% for Fruits');
  const medCategoryRate = resolveCommissionRate({ category: 'Medicines' }, { supplierDetails: {} }, mockSettings);
  assert.strictEqual(medCategoryRate, 5, 'Should use category override 5% for Medicines');

  // Tier 2: Supplier-specific override takes precedence over category (e.g. 7%)
  const supplierOverrideRate = resolveCommissionRate(
    { category: 'Fruits' },
    { supplierDetails: { commissionPercentage: 7 } },
    mockSettings
  );
  assert.strictEqual(supplierOverrideRate, 7, 'Supplier override must take precedence over category rate');

  // Tier 1: Product-specific override takes TOP precedence (e.g. 12% on a specific fruit)
  const productOverrideRate = resolveCommissionRate(
    { category: 'Fruits', commissionPercentage: 12 },
    { supplierDetails: { commissionPercentage: 7 } },
    mockSettings
  );
  assert.strictEqual(productOverrideRate, 12, 'Product override must take top precedence over supplier and category');
  console.log('✓ 4-Tier Commission hierarchy resolution verified (Product 12% > Supplier 7% > Category 10% > Global 10%)');

  // 11. Test Multi-Item E2E Commission Calculation (₹2,500 Gross -> ₹210 Comm -> ₹2,290 Net)
  const item1 = calculateItemCommissionSnapshot(
    { price: 1000, supplier: supplier1._id, category: 'Fruits' },
    supplier1,
    mockSettings,
    1
  ); // Fruits 10% => 1000 gross, 100 comm, 900 net
  assert.strictEqual(item1.grossAmount, 1000);
  assert.strictEqual(item1.commissionAmount, 100);
  assert.strictEqual(item1.supplierPayableAmount, 900);

  const item2 = calculateItemCommissionSnapshot(
    { price: 500, supplier: supplier1._id, category: 'Fruits' },
    supplier1,
    mockSettings,
    2
  ); // Fruits 10% => 1000 gross, 100 comm, 900 net
  assert.strictEqual(item2.grossAmount, 1000);
  assert.strictEqual(item2.commissionAmount, 100);
  assert.strictEqual(item2.supplierPayableAmount, 900);

  const item3 = calculateItemCommissionSnapshot(
    { price: 200, supplier: supplier1._id, category: 'Medicines' },
    supplier1,
    mockSettings,
    1
  ); // Medicines 5% => 200 gross, 10 comm, 190 net
  assert.strictEqual(item3.grossAmount, 200);
  assert.strictEqual(item3.commissionAmount, 10);
  assert.strictEqual(item3.supplierPayableAmount, 190);

  const item4 = calculateItemCommissionSnapshot(
    { price: 300, supplier: supplier1._id, category: 'Stationery', commissionPercentage: 0 },
    supplier1,
    mockSettings,
    1
  ); // Stationery with 0% product override => 300 gross, 0 comm, 300 net
  assert.strictEqual(item4.grossAmount, 300);
  assert.strictEqual(item4.commissionAmount, 0);
  assert.strictEqual(item4.supplierPayableAmount, 300);

  const totalGross = item1.grossAmount + item2.grossAmount + item3.grossAmount + item4.grossAmount;
  const totalComm = item1.commissionAmount + item2.commissionAmount + item3.commissionAmount + item4.commissionAmount;
  const totalNet = item1.supplierPayableAmount + item2.supplierPayableAmount + item3.supplierPayableAmount + item4.supplierPayableAmount;

  assert.strictEqual(totalGross, 2500, 'Total gross must equal 2500');
  assert.strictEqual(totalComm, 210, 'Total commission must equal 210');
  assert.strictEqual(totalNet, 2290, 'Total net payable must equal 2290');
  console.log('✓ Multi-item end-to-end scenario verified (₹2,500 Gross - ₹210 Commission = ₹2,290 Net)');

  // 12. Test Order Creation with Supplier Item Snapshots & Delivery Settlement
  const testOrder = await Order.create({
    user: student._id,
    items: [
      {
        product: createdProduct._id,
        name: 'Organic Shimla Apples (1kg)',
        price: 1000,
        quantity: 1,
        image: 'https://res.cloudinary.com/test/image/upload/apples.jpg',
        supplier: supplier1._id,
        grossAmount: 1000,
        commissionRate: 10,
        commissionAmount: 100,
        supplierPayableAmount: 900,
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
    totalAmount: 1000,
    itemsPrice: 1000,
    deliveryCharge: 0,
    platformFee: 0,
    orderStatus: 'Confirmed',
  });

  // 13. Test Delivery Settlement Trigger & Financial Ledger Generation
  testOrder.orderStatus = 'Delivered';
  testOrder.deliveredAt = new Date();
  await processOrderDeliverySettlement(testOrder, admin);
  await testOrder.save();

  // Verify item settlement status transitioned to 'Eligible'
  assert.strictEqual(testOrder.items[0].settlementStatus, 'Eligible');

  // Verify Ledger entries created for Supplier 1 (SALE credit + COMMISSION debit)
  const ledgerEntries = await FinancialLedger.find({ order: testOrder._id, supplier: supplier1._id });
  assert.strictEqual(ledgerEntries.length, 2, 'Must have SALE and COMMISSION ledger entries');
  const saleEntry = ledgerEntries.find((e) => e.type === 'SALE');
  const commEntry = ledgerEntries.find((e) => e.type === 'COMMISSION');
  assert.ok(saleEntry && saleEntry.direction === 'CREDIT' && saleEntry.amount === 1000);
  assert.ok(commEntry && commEntry.direction === 'DEBIT' && commEntry.amount === 100);
  console.log('✓ Delivery settlement and immutable ledger entry generation verified');

  // 14. Test Supplier Finance API
  const mockFinanceReq = { user: supplier1 };
  let financeData = null;
  const mockFinanceRes = {
    json(data) {
      assert.ok(data.metrics, 'Finance metrics returned');
      assert.strictEqual(data.metrics.totalDeliveredGross >= 1000, true);
      assert.strictEqual(data.metrics.totalDeliveredCommission >= 100, true);
      assert.strictEqual(data.metrics.totalDeliveredPayable >= 900, true);
      assert.strictEqual(data.metrics.nextPayoutDay, 'Saturday');
      financeData = data;
    },
  };
  await getSupplierFinance(mockFinanceReq, mockFinanceRes);
  console.log('✓ Supplier finance metrics & Saturday cycle verified');

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
      assert.strictEqual(data.payout.netPayable, 900);
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
  assert.strictEqual(payoutLedger.amount, 900);
  console.log('✓ Payout mark-as-paid with UTR, Settled state and PAYOUT ledger entry verified');

  // 17. Test Saturday Batch Generation Functionality
  const mockSaturdayReq = { user: admin, body: {} };
  const mockSaturdayRes = {
    status(code) {
      assert.ok(code === 200 || code === 201, `Expected status 200 or 201, got ${code}`);
      return this;
    },
    json(data) {
      assert.strictEqual(typeof data.count, 'number');
      assert.ok(data.message, 'Message returned from Saturday batch generator');
    },
  };
  const { generateSaturdayPayoutBatch } = await import('../controllers/adminController.js');
  await generateSaturdayPayoutBatch(mockSaturdayReq, mockSaturdayRes);
  console.log('✓ Saturday payout batch generator verified');

  // 18. Clean up test data
  await Product.deleteOne({ _id: createdProduct._id });
  await Order.deleteOne({ _id: testOrder._id });
  await SupplierPayout.deleteOne({ _id: createdPayout._id });
  await FinancialLedger.deleteMany({ supplier: supplier1._id });
  console.log('✓ Cleanup completed');
  console.log('--- ALL SUPPLIER & FINANCIAL TESTS PASSED ---\n');
}
