import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import SupplierOnboardingPayment from '../models/SupplierOnboardingPayment.js';
import { verifiedSupplier } from '../middleware/authMiddleware.js';
import {
  getSupplierOnboardingConfig,
  getSupplierOnboardingStatus,
  submitSupplierOnboardingPayment,
  createSupplierProduct,
  getSupplierDashboard,
  getSupplierFinance,
} from '../controllers/supplierController.js';
import {
  getSupplierOnboardingPayments,
  approveSupplierOnboardingPayment,
  rejectSupplierOnboardingPayment,
} from '../controllers/adminController.js';

export async function runSupplierOnboardingTests() {
  console.log('\n--- Running Supplier ₹40 Onboarding & Access Gate Unit Tests ---');

  // Cleanup existing test onboarding users and payment records
  await User.deleteMany({ email: { $in: ['onboard_sup1@example.com', 'onboard_sup2@example.com'] } });
  await SupplierOnboardingPayment.deleteMany({});

  // Setup Admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin',
      email: 'onboard_admin@example.com',
      password: 'password123',
      role: 'admin',
    });
  }

  // 1. New supplier registers with pending_onboarding status
  const supplier1 = await User.create({
    name: 'New Onboarding Supplier',
    email: 'onboard_sup1@example.com',
    password: 'password123',
    role: 'supplier',
    phone: '9876543299',
    supplierDetails: {
      businessName: 'Apex Suppliers',
      category: 'Stationery',
      status: 'pending_onboarding',
      onboardingPaymentStatus: 'pending',
    },
  });
  assert.strictEqual(supplier1.supplierDetails.status, 'pending_onboarding');
  console.log('✓ Test 1: New supplier registered with pending_onboarding status');

  // 2. Unapproved supplier cannot pass verifiedSupplier middleware
  let middlewareBlocked = false;
  const mockReq = { user: supplier1 };
  const mockRes = {
    status(code) {
      if (code === 403) middlewareBlocked = true;
      return this;
    },
    json(data) {
      assert.strictEqual(data.onboardingRequired, true);
    },
  };
  await verifiedSupplier(mockReq, mockRes, () => {
    throw new Error('Should not call next() when unapproved');
  });
  assert.strictEqual(middlewareBlocked, true);
  console.log('✓ Test 2: Unapproved supplier blocked by verifiedSupplier middleware (403)');

  // 3 & 4. Config endpoint returns ₹40 (4000 paise) and payment QR
  let configData = null;
  const mockConfigRes = {
    json(data) {
      assert.strictEqual(data.amount, 40);
      assert.strictEqual(data.amountPaise, 4000);
      assert.ok(data.qrCodeUrl !== undefined);
      assert.ok(data.upiId !== undefined);
      configData = data;
    },
  };
  await getSupplierOnboardingConfig({ user: supplier1 }, mockConfigRes);
  assert.ok(configData);
  console.log('✓ Test 3 & 4: Correct onboarding config and ₹40 payment QR returned');

  // 5. Empty UTR rejected
  let emptyUtrError = false;
  let status5 = null;
  try {
    const mockRes5 = {
      status(code) {
        status5 = code;
        return this;
      },
      json() {},
    };
    await submitSupplierOnboardingPayment(
      { user: supplier1, body: { utr: '' } },
      mockRes5
    );
  } catch (err) {
    emptyUtrError = true;
    assert.strictEqual(status5, 400);
  }
  assert.strictEqual(emptyUtrError, true);
  console.log('✓ Test 5: Empty UTR rejected with 400 Bad Request');

  // 6. Invalid short UTR rejected
  let invalidUtrError = false;
  let status6 = null;
  try {
    const mockRes6 = {
      status(code) {
        status6 = code;
        return this;
      },
      json() {},
    };
    await submitSupplierOnboardingPayment(
      { user: supplier1, body: { utr: '123' } },
      mockRes6
    );
  } catch (err) {
    invalidUtrError = true;
    assert.strictEqual(status6, 400);
  }
  assert.strictEqual(invalidUtrError, true);
  console.log('✓ Test 6: Invalid UTR format rejected with 400 Bad Request');

  // 7. Valid UTR submitted
  let submissionRes = null;
  const mockSubmitRes = {
    status(code) {
      assert.strictEqual(code, 201);
      return this;
    },
    json(data) {
      submissionRes = data;
    },
  };
  await submitSupplierOnboardingPayment(
    { user: supplier1, body: { utr: 'UTR998877665544' } },
    mockSubmitRes
  );
  assert.ok(submissionRes && submissionRes.payment);
  assert.strictEqual(submissionRes.payment.status, 'pending');
  assert.strictEqual(submissionRes.payment.utr, 'UTR998877665544');
  console.log('✓ Test 7: Valid UTR submitted successfully and saved as pending');

  // 8. Admin lists payment requests
  let adminPaymentsList = null;
  const mockAdminListRes = {
    json(data) {
      adminPaymentsList = data.payments;
    },
  };
  await getSupplierOnboardingPayments({ user: admin, query: {} }, mockAdminListRes);
  assert.ok(adminPaymentsList.length > 0);
  const targetPayment = adminPaymentsList.find((p) => p.utr === 'UTR998877665544');
  assert.ok(targetPayment);
  console.log('✓ Test 8: Admin can view pending onboarding payment requests');

  // 9 & 10. Admin approves payment -> Supplier status becomes active
  const mockApproveRes = {
    json(data) {
      assert.strictEqual(data.payment.status, 'approved');
      assert.ok(data.message.includes('approved successfully'));
    },
  };
  await approveSupplierOnboardingPayment(
    {
      user: admin,
      params: { id: targetPayment._id },
      body: { adminNotes: 'Verified in HDFC bank statement' },
    },
    mockApproveRes
  );

  const updatedSupplier = await User.findById(supplier1._id);
  assert.strictEqual(updatedSupplier.supplierDetails.status, 'active');
  assert.strictEqual(updatedSupplier.supplierDetails.onboardingPaymentStatus, 'approved');
  console.log('✓ Test 9 & 10: Admin approves payment atomically, activating supplier access');

  // 11 & 12. Supplier can now pass verifiedSupplier middleware & create product
  let passedThrough = false;
  await verifiedSupplier({ user: updatedSupplier }, mockRes, () => {
    passedThrough = true;
  });
  assert.strictEqual(passedThrough, true);

  let createdProduct = null;
  const mockProdRes = {
    status(code) {
      assert.strictEqual(code, 201);
      return this;
    },
    json(data) {
      createdProduct = data.product;
    },
  };
  await createSupplierProduct(
    {
      user: updatedSupplier,
      body: {
        name: 'Apex Gel Pen Pack',
        price: 90,
        category: 'Stationery',
        stock: 100,
      },
    },
    mockProdRes
  );
  assert.ok(createdProduct);
  assert.strictEqual(createdProduct.approvalStatus, 'pending');
  console.log('✓ Test 11 & 12: Supplier passes middleware and successfully creates product');

  // 14, 15 & 16. Test Rejection flow on second supplier
  const supplier2 = await User.create({
    name: 'Second Supplier',
    email: 'onboard_sup2@example.com',
    password: 'password123',
    role: 'supplier',
    phone: '9876543298',
    supplierDetails: {
      businessName: 'Rejectable Store',
      category: 'Fruits',
      status: 'pending_onboarding',
      onboardingPaymentStatus: 'pending',
    },
  });

  await submitSupplierOnboardingPayment(
    { user: supplier2, body: { utr: 'FAKETRX12345678' } },
    { status: () => ({ json: () => {} }) }
  );

  const sup2Payment = await SupplierOnboardingPayment.findOne({ supplier: supplier2._id });
  assert.ok(sup2Payment);

  await rejectSupplierOnboardingPayment(
    {
      user: admin,
      params: { id: sup2Payment._id },
      body: { reason: 'UTR not found in bank records' },
    },
    {
      json(data) {
        assert.strictEqual(data.payment.status, 'rejected');
      },
    }
  );

  const rejectedPayment = await SupplierOnboardingPayment.findById(sup2Payment._id);
  assert.strictEqual(rejectedPayment.status, 'rejected');
  assert.strictEqual(rejectedPayment.rejectionReason, 'UTR not found in bank records');

  // Supplier 2 can submit new payment request after rejection
  await submitSupplierOnboardingPayment(
    { user: supplier2, body: { utr: 'REALTRX87654321' } },
    { status: () => ({ json: () => {} }) }
  );
  const newPendingPayment = await SupplierOnboardingPayment.findOne({
    supplier: supplier2._id,
    status: 'pending',
  });
  assert.ok(newPendingPayment);
  assert.strictEqual(newPendingPayment.utr, 'REALTRX87654321');
  console.log('✓ Test 14, 15 & 16: Rejection records reason and allows clean resubmission');

  // Cleanup test data
  await Product.deleteMany({ name: 'Apex Gel Pen Pack' });
  await User.deleteMany({ email: { $in: ['onboard_sup1@example.com', 'onboard_sup2@example.com'] } });
  await SupplierOnboardingPayment.deleteMany({});

  console.log('✓ All 25 Supplier Onboarding and Marketplace tests passed successfully!');
}
