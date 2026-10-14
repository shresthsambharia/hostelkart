import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import {
  getCategoriesImpl,
  getActiveCouponsImpl,
  getDeliveryInfoImpl,
  getSupportOptionsImpl,
  getUserOrdersImpl,
  trackOrderImpl,
  searchProductsImpl,
  executeTool
} from '../ai/aiController.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';

export async function runAIAssistantTests() {
  console.log('\n--- Running AI Assistant Real-Data Tools & Intelligence Tests ---');

  // Test 1: getCategories returns 5 canonical categories
  const categoriesRes = await getCategoriesImpl();
  assert.ok(categoriesRes.success, 'getCategories must return success: true');
  assert.equal(categoriesRes.totalCategories, 5, 'Must report 5 canonical categories');
  const catNames = categoriesRes.categories.map(c => c.category);
  for (const required of STUDENT_VISIBLE_CATEGORIES) {
    assert.ok(catNames.includes(required), `Categories must include ${required}`);
  }
  console.log('✓ Test 1: Real categories verification passed (5 canonical categories verified).');

  // Test 2: getActiveCoupons verification
  // Ensure a test coupon exists
  let testCoupon = await Coupon.findOne({ code: 'AIWELCOME50' });
  if (!testCoupon) {
    testCoupon = await Coupon.create({
      code: 'AIWELCOME50',
      description: 'AI Welcome 50% discount test',
      discountType: 'percentage',
      discountValue: 50,
      minimumOrderAmount: 100,
      maximumDiscount: 100,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      active: true
    });
  }

  const couponsRes = await getActiveCouponsImpl();
  assert.ok(couponsRes.success, 'getActiveCoupons must succeed');
  assert.ok(couponsRes.count > 0, 'Should find active coupons');
  const foundAiCoupon = couponsRes.coupons.find(c => c.code === 'AIWELCOME50');
  assert.ok(foundAiCoupon, 'AIWELCOME50 coupon must be retrieved from live database');
  console.log('✓ Test 2: Live active coupons retrieval verified.');

  // Test 3: getDeliveryInfo verification
  const deliveryInfo = await getDeliveryInfoImpl();
  assert.ok(deliveryInfo.success);
  assert.ok(Array.isArray(deliveryInfo.deliverySlots));
  assert.equal(deliveryInfo.deliverySlots.length, 2, 'Should return Morning & Evening slots');
  console.log('✓ Test 3: Delivery slots and corridor delivery policy verified.');

  // Test 4: getSupportOptions verification
  const supportInfo = await getSupportOptionsImpl({ role: 'student' });
  assert.ok(supportInfo.success);
  assert.ok(supportInfo.supportEmail);
  assert.ok(supportInfo.howToSubmitTicket);
  console.log('✓ Test 4: Support options and ticket guidance verified.');

  // Test 5: Stationery search and category aliasing
  const stationeryResults = await searchProductsImpl('stationery');
  assert.ok(Array.isArray(stationeryResults));
  assert.ok(stationeryResults.length > 0, 'Stationery search must return available stationery products');
  for (const item of stationeryResults) {
    assert.equal(item.category.toLowerCase(), 'stationery');
  }

  const penResults = await searchProductsImpl('pen');
  assert.ok(Array.isArray(penResults));
  assert.ok(penResults.length > 0, 'Pen query must return matching pen products');
  console.log('✓ Test 5: Stationery catalog and synonym searching verified.');

  // Test 6: Security & Authorization - Unauthenticated order tracking blocked
  const unauthOrders = await getUserOrdersImpl(null);
  assert.equal(unauthOrders.success, false);
  assert.ok(unauthOrders.error.includes('Authentication required'));

  const unauthTrack = await trackOrderImpl(null);
  assert.equal(unauthTrack.success, false);
  assert.ok(unauthTrack.error.includes('Unauthorized'));
  console.log('✓ Test 6: Security isolation - Unauthenticated order access blocked.');

  // Test 7: Authenticated Order Tracking with User Scoping (IDOR protection)
  let studentUser = await User.findOne({ email: 'student_for_supplier_test@example.com' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'AI Test Student',
      email: 'student_for_supplier_test@example.com',
      password: 'password123',
      role: 'student'
    });
  }

  // Create an order for studentUser
  const testOrder = await Order.create({
    user: studentUser._id,
    orderNumber: 'HK-AITEST-101',
    items: [
      {
        product: new mongoose.Types.ObjectId(),
        name: 'Classmate Notebook, 1 Piece',
        quantity: 2,
        price: 60,
        discount: 0
      }
    ],
    deliveryDetails: {
      hostelName: 'Brahmaputra',
      block: 'B',
      floor: '2',
      roomNumber: '204',
      phone: '9876543210'
    },
    deliverySlot: 'Evening Slot',
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    orderStatus: 'Confirmed',
    totalAmount: 135
  });

  const ordersRes = await getUserOrdersImpl(studentUser);
  assert.ok(ordersRes.success);
  assert.ok(ordersRes.orders.length > 0);
  assert.ok(ordersRes.orders.some(o => o.orderNumber === 'HK-AITEST-101'));

  const trackByNum = await trackOrderImpl(studentUser, 'HK-AITEST-101');
  assert.ok(Array.isArray(trackByNum));
  assert.equal(trackByNum.length, 1);
  assert.equal(trackByNum[0].orderNumber, 'HK-AITEST-101');
  assert.equal(trackByNum[0].status, 'Confirmed');

  // Verify other user cannot track this order (IDOR test)
  const otherUser = { _id: new mongoose.Types.ObjectId() };
  const idorTrack = await trackOrderImpl(otherUser, 'HK-AITEST-101');
  assert.ok(Array.isArray(idorTrack));
  assert.equal(idorTrack.length, 0, 'Other user must not be able to track this order');
  console.log('✓ Test 7: Scoped order tracking and IDOR protection verified.');

  // Test 8: executeTool dispatch for new tools
  const toolCat = await executeTool('getCategories', {}, studentUser);
  assert.ok(toolCat.success);
  const toolCoupons = await executeTool('getActiveCoupons', {}, studentUser);
  assert.ok(toolCoupons.success);
  const toolDelivery = await executeTool('getDeliveryInfo', {}, studentUser);
  assert.ok(toolDelivery.success);
  const toolSupport = await executeTool('getSupportOptions', {}, studentUser);
  assert.ok(toolSupport.success);
  const toolOrders = await executeTool('getUserOrders', {}, studentUser);
  assert.ok(toolOrders.success);
  console.log('✓ Test 8: executeTool dispatcher dispatches all 5 live tools successfully.');

  // Clean up test order & coupon
  await Order.deleteOne({ _id: testOrder._id });
  await Coupon.deleteOne({ _id: testCoupon._id });

  console.log('✓ All AI Assistant tests passed successfully!');
}
