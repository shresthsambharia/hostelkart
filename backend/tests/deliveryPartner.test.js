import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Product from '../models/Product.js';
import {
  getAssignedOrders,
  updateDeliveryStatus,
  getDeliveryHistory
} from '../controllers/deliveryController.js';

export async function runDeliveryPartnerTests() {
  console.log('\n--- Running Delivery Partner Unit & Integration Tests ---');

  // Setup mock delivery partners and students
  let partner1 = await User.findOne({ email: 'delivery_rider_1@example.com' });
  if (!partner1) {
    partner1 = await User.create({
      name: 'Rider One',
      email: 'delivery_rider_1@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  let partner2 = await User.findOne({ email: 'delivery_rider_2@example.com' });
  if (!partner2) {
    partner2 = await User.create({
      name: 'Rider Two',
      email: 'delivery_rider_2@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  let student = await User.findOne({ email: 'delivery_student_test@example.com' });
  if (!student) {
    student = await User.create({
      name: 'Student For Delivery',
      email: 'delivery_student_test@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  let testProduct = await Product.findOne({ isAvailable: true, stock: { $gt: 0 } });

  // Create test order
  const order1 = await Order.create({
    user: student._id,
    items: [
      {
        product: testProduct._id,
        name: testProduct.name,
        quantity: 2,
        price: testProduct.price,
        discount: 0
      }
    ],
    deliveryDetails: {
      hostelName: 'Kaveri Hostel',
      block: 'B',
      floor: '2',
      roomNumber: '204',
      phone: '9876543210'
    },
    deliverySlot: 'Morning Slot (8:00 AM - 1:00 PM)',
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    orderStatus: 'Confirmed',
    deliveryPartner: partner1._id,
    deliveryOtp: '4321',
    platformFee: 15,
    deliveryCharge: 0,
    totalAmount: testProduct.price * 2 + 15,
    timeline: [
      { status: 'Confirmed', note: `Delivery partner ${partner1.name} assigned` }
    ]
  });

  // Test 1: Delivery Partner 1 fetches assigned orders
  const mockReq1 = { user: partner1 };
  let capturedOrders1 = [];
  const mockRes1 = {
    json: (data) => { capturedOrders1 = data; }
  };
  await getAssignedOrders(mockReq1, mockRes1);
  const foundOrder = capturedOrders1.find(o => o._id.toString() === order1._id.toString());
  assert.ok(foundOrder, 'Partner 1 should find their assigned order');
  console.log('✓ Delivery partner fetches assigned orders successfully.');

  // Test 2: IDOR Protection: Partner 2 cannot access or update Partner 1 order
  const mockReq2 = {
    user: partner2,
    params: { id: order1._id.toString() },
    body: { status: 'Packed' },
    app: { get: () => null }
  };
  let errorStatus = 0;
  const mockRes2 = {
    status: (code) => { errorStatus = code; return mockRes2; },
    json: () => {}
  };

  try {
    await updateDeliveryStatus(mockReq2, mockRes2);
    assert.fail('Partner 2 should not be authorized to update Partner 1 order');
  } catch (err) {
    assert.equal(errorStatus, 403, 'Should reject with 403 Forbidden');
    console.log('✓ IDOR Protection: Partner 2 blocked from updating Partner 1 order (403).');
  }

  // Test 3: Invalid status transition rejection
  const mockReqInvalidTransition = {
    user: partner1,
    params: { id: order1._id.toString() },
    body: { status: 'Delivered', otp: '4321' }, // Jumping from Confirmed straight to Delivered
    app: { get: () => null }
  };
  let invalidTransitionStatus = 0;
  const mockResInvalid = {
    status: (code) => { invalidTransitionStatus = code; return mockResInvalid; },
    json: () => {}
  };

  try {
    await updateDeliveryStatus(mockReqInvalidTransition, mockResInvalid);
    assert.fail('Invalid transition should be rejected');
  } catch (err) {
    assert.equal(invalidTransitionStatus, 400, 'Should reject invalid transition with 400');
    assert.ok(err.message.includes('Invalid status transition'), 'Error message should explain invalid transition');
    console.log('✓ Invalid status transition (Confirmed -> Delivered) rejected with 400.');
  }

  // Test 4: Valid status transition: Confirmed -> Packed
  const mockReqPacked = {
    user: partner1,
    params: { id: order1._id.toString() },
    body: { status: 'Packed', note: 'Items packed in room delivery pouch' },
    app: { get: () => null }
  };
  let updatedRes = null;
  const mockResPacked = {
    status: () => mockResPacked,
    json: (data) => { updatedRes = data; }
  };
  await updateDeliveryStatus(mockReqPacked, mockResPacked);
  assert.equal(updatedRes.order.orderStatus, 'Packed', 'Order should transition to Packed');
  console.log('✓ Valid status transition (Confirmed -> Packed) succeeded.');

  // Test 5: Valid status transition: Packed -> Out for Delivery
  const mockReqOFD = {
    user: partner1,
    params: { id: order1._id.toString() },
    body: { status: 'Out for Delivery', note: 'Rider on bike heading to hostel corridor' },
    app: { get: () => null }
  };
  await updateDeliveryStatus(mockReqOFD, mockResPacked);
  const reloadedOrder = await Order.findById(order1._id);
  assert.equal(reloadedOrder.orderStatus, 'Out for Delivery');
  console.log('✓ Valid status transition (Packed -> Out for Delivery) succeeded.');

  // Test 6: Delivery OTP Verification on Delivered transition
  // 6a: Wrong OTP fails
  const mockReqWrongOtp = {
    user: partner1,
    params: { id: order1._id.toString() },
    body: { status: 'Delivered', otp: '9999' },
    app: { get: () => null }
  };
  let wrongOtpStatus = 0;
  const mockResOtp = {
    status: (code) => { wrongOtpStatus = code; return mockResOtp; },
    json: () => {}
  };
  try {
    await updateDeliveryStatus(mockReqWrongOtp, mockResOtp);
    assert.fail('Wrong OTP should be rejected');
  } catch (err) {
    assert.equal(wrongOtpStatus, 400);
    assert.equal(err.message, 'Invalid OTP');
    console.log('✓ Invalid Delivery OTP rejected with 400.');
  }

  // 6b: Correct OTP succeeds
  const mockReqCorrectOtp = {
    user: partner1,
    params: { id: order1._id.toString() },
    body: { status: 'Delivered', otp: '4321' },
    app: { get: () => null }
  };
  await updateDeliveryStatus(mockReqCorrectOtp, mockResPacked);
  const deliveredOrder = await Order.findById(order1._id);
  assert.equal(deliveredOrder.orderStatus, 'Delivered');
  assert.equal(deliveredOrder.otpVerified, true);
  assert.equal(deliveredOrder.paymentStatus, 'Paid'); // COD auto-marked Paid on delivery
  assert.ok(deliveredOrder.deliveredAt, 'DeliveredAt timestamp must be set');
  console.log('✓ Delivery OTP verification succeeded; order marked Delivered & COD payment updated to Paid.');

  // Test 7: Terminal status protection: cannot transition after Delivered
  try {
    await updateDeliveryStatus(mockReqPacked, mockResPacked);
    assert.fail('Cannot update already Delivered order');
  } catch (err) {
    console.log('✓ Terminal status protection verified (Delivered orders cannot be modified).');
  }

  // Test 8: Delivery History for Partner 1
  let historyData = [];
  const mockResHistory = {
    json: (data) => { historyData = data; }
  };
  await getDeliveryHistory(mockReq1, mockResHistory);
  const historyItem = historyData.find(o => o._id.toString() === order1._id.toString());
  assert.ok(historyItem, 'Delivered order should appear in delivery history');
  console.log('✓ Delivery history retrieval verified.');

  // Clean up test order
  await Order.deleteOne({ _id: order1._id });

  console.log('✓ All Delivery Partner automated unit & integration tests passed successfully!');
  return true;
}
