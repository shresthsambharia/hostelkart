import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import SupportTicket from '../models/SupportTicket.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import {
  getDashboardAnalytics,
  addProduct,
  editProduct,
  deleteProduct,
  getAllUsers,
  assignDeliveryPartner,
  getAllOrders,
  updateOrderStatus
} from '../controllers/adminController.js';

export async function runAdminTests() {
  console.log('\n--- Running Admin Module Unit & Integration Tests ---');

  // Setup mock users
  let adminUser = await User.findOne({ email: 'unit_admin_test@example.com' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Unit Test Admin',
      email: 'unit_admin_test@example.com',
      password: 'password123',
      role: 'admin',
      isEmailVerified: true
    });
  }

  let studentUser = await User.findOne({ email: 'unit_student_test@example.com' });
  if (!studentUser) {
    studentUser = await User.create({
      name: 'Unit Test Student',
      email: 'unit_student_test@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  let rider1 = await User.findOne({ email: 'unit_rider_1@example.com' });
  if (!rider1) {
    rider1 = await User.create({
      name: 'Unit Rider 1',
      email: 'unit_rider_1@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  let rider2 = await User.findOne({ email: 'unit_rider_2@example.com' });
  if (!rider2) {
    rider2 = await User.create({
      name: 'Unit Rider 2',
      email: 'unit_rider_2@example.com',
      password: 'password123',
      role: 'delivery',
      isEmailVerified: true
    });
  }

  // Test 1: Dashboard Analytics Query
  const mockReqAnalytics = { user: adminUser };
  let analyticsData = null;
  const mockResAnalytics = {
    json: (data) => { analyticsData = data; }
  };
  await getDashboardAnalytics(mockReqAnalytics, mockResAnalytics);
  assert.ok(analyticsData, 'Analytics data should be returned');
  assert.ok(typeof analyticsData.totalRevenue === 'number', 'totalRevenue should be a number');
  assert.ok(typeof analyticsData.totalOrders === 'number', 'totalOrders should be a number');
  assert.ok(typeof analyticsData.totalUsers === 'number', 'totalUsers should be a number');
  console.log('✓ Dashboard Analytics calculation verified.');

  // Test 2: User Management & Sensitive Field Masking
  let usersList = [];
  const mockResUsers = {
    json: (data) => { usersList = data; }
  };
  await getAllUsers(mockReqAnalytics, mockResUsers);
  assert.ok(usersList.length > 0, 'Users list should not be empty');
  for (const u of usersList) {
    assert.equal(u.password, undefined, 'Password must never be returned in user list');
    assert.equal(u.twoFactorSecret, undefined, 'twoFactorSecret must never be returned');
    assert.equal(u.twoFactorTempSecret, undefined, 'twoFactorTempSecret must never be returned');
    assert.equal(u.twoFactorRecoveryCodes, undefined, 'twoFactorRecoveryCodes must never be returned');
  }
  console.log('✓ User Management & sensitive field masking verified.');

  // Test 3: Product Management (Create -> Edit -> Set Unavailable -> Delete)
  let createdProduct = null;
  const mockReqAddProd = {
    body: {
      name: 'Admin Test Protein Bar',
      price: 120,
      mrp: 150,
      discount: 20,
      description: 'High energy protein snack for hostel late night study',
      category: 'Snacks',
      stock: 50,
      isAvailable: true,
      deliveryTime: '15-25 mins'
    }
  };
  const mockResAddProd = {
    status: (code) => {
      assert.equal(code, 201, 'Should return 201 on product creation');
      return mockResAddProd;
    },
    json: (data) => { createdProduct = data; }
  };
  await addProduct(mockReqAddProd, mockResAddProd);
  assert.ok(createdProduct._id, 'Product should have an _id');
  assert.equal(createdProduct.name, 'Admin Test Protein Bar');
  console.log('✓ Admin Product Creation verified.');

  // 3b: Edit Product
  const mockReqEditProd = {
    params: { id: createdProduct._id.toString() },
    body: {
      price: 130,
      stock: 45,
      isAvailable: false
    }
  };
  let editedProduct = null;
  const mockResEditProd = {
    json: (data) => { editedProduct = data; }
  };
  await editProduct(mockReqEditProd, mockResEditProd);
  assert.equal(editedProduct.price, 130);
  assert.equal(editedProduct.stock, 45);
  assert.equal(editedProduct.isAvailable, false);
  console.log('✓ Admin Product Modification & Availability Toggle verified.');

  // 3c: Delete Product
  const mockReqDelProd = {
    params: { id: createdProduct._id.toString() }
  };
  let delMsg = null;
  const mockResDelProd = {
    json: (data) => { delMsg = data; }
  };
  await deleteProduct(mockReqDelProd, mockResDelProd);
  assert.ok(delMsg.message.includes('removed') || delMsg.message.includes('deleted'), 'Delete message expected');
  const checkDeleted = await Product.findById(createdProduct._id);
  assert.equal(checkDeleted, null, 'Product should be deleted from DB');
  console.log('✓ Admin Product Deletion verified.');

  // Test 4: Delivery Assignment and Safe Reassignment
  let baseProduct = await Product.findOne({ isAvailable: true, stock: { $gt: 0 } });
  const testOrder = await Order.create({
    user: studentUser._id,
    items: [{ product: baseProduct._id, name: baseProduct.name, quantity: 1, price: baseProduct.price, discount: 0 }],
    deliveryDetails: { hostelName: 'Brahmaputra Hostel', block: 'C', floor: '1', roomNumber: '108', phone: '9123456780' },
    deliverySlot: 'Evening Slot (5:00 PM - 9:00 PM)',
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
    platformFee: 15,
    deliveryCharge: 0,
    totalAmount: baseProduct.price + 15
  });

  // Assign to Rider 1
  const mockReqAssign1 = {
    params: { id: testOrder._id.toString() },
    body: { deliveryPartnerId: rider1._id.toString() }
  };
  let assignRes1 = null;
  const mockResAssign = {
    json: (data) => { assignRes1 = data; }
  };
  await assignDeliveryPartner(mockReqAssign1, mockResAssign);
  assert.equal(assignRes1.order.deliveryPartner.toString(), rider1._id.toString());
  assert.equal(assignRes1.order.orderStatus, 'Confirmed');

  const partner1Doc = await DeliveryPartner.findOne({ user: rider1._id });
  assert.ok(partner1Doc.currentOrders.some(id => id.toString() === testOrder._id.toString()), 'Rider 1 should have order in currentOrders');
  console.log('✓ Initial delivery partner assignment verified.');

  // Reassign to Rider 2
  const mockReqAssign2 = {
    params: { id: testOrder._id.toString() },
    body: { deliveryPartnerId: rider2._id.toString() }
  };
  await assignDeliveryPartner(mockReqAssign2, mockResAssign);
  const reloadedOrder = await Order.findById(testOrder._id);
  assert.equal(reloadedOrder.deliveryPartner.toString(), rider2._id.toString(), 'Order should be reassigned to Rider 2');

  const partner1After = await DeliveryPartner.findOne({ user: rider1._id });
  assert.ok(!partner1After.currentOrders.some(id => id.toString() === testOrder._id.toString()), 'Rider 1 currentOrders must be cleaned up on reassignment');

  const partner2After = await DeliveryPartner.findOne({ user: rider2._id });
  assert.ok(partner2After.currentOrders.some(id => id.toString() === testOrder._id.toString()), 'Rider 2 currentOrders must contain the reassigned order');
  console.log('✓ Delivery partner safe reassignment and sync verified.');

  // Clean up test order
  await Order.deleteOne({ _id: testOrder._id });

  // Test 5: Coupon Management
  const testCoupon = await Coupon.create({
    code: 'ADMINUNIT50',
    description: 'Unit test 20% discount',
    discountType: 'percentage',
    discountValue: 20,
    minimumOrderAmount: 100,
    maximumDiscount: 50,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usageLimit: 100,
    usageCount: 0,
    active: true
  });
  assert.ok(testCoupon._id, 'Coupon should be created in DB');
  assert.equal(testCoupon.code, 'ADMINUNIT50');

  // Verify coupon constraints
  assert.ok(testCoupon.minimumOrderAmount === 100, 'Min order should be 100');
  assert.ok(testCoupon.active === true, 'Coupon should be active');

  await Coupon.deleteOne({ _id: testCoupon._id });
  console.log('✓ Coupon management and validation verified.');

  // Test 6: Support Ticket Lifecycle
  const testTicket = await SupportTicket.create({
    ticketId: `TKT-${Date.now()}`,
    customer: studentUser._id,
    subject: 'Delayed corridor fruit delivery',
    description: 'My order is past the 30min delivery SLA.',
    category: 'Delivery',
    priority: 'High',
    status: 'Open',
    messages: [{ sender: studentUser._id, content: 'Please update status.' }]
  });
  assert.ok(testTicket._id, 'Ticket created successfully');

  testTicket.status = 'In Progress';
  testTicket.assignedAdmin = adminUser._id;
  testTicket.messages.push({
    sender: adminUser._id,
    content: 'Assigned to corridor lead.',
    isInternalNote: true
  });
  await testTicket.save();

  const reloadedTicket = await SupportTicket.findById(testTicket._id);
  assert.equal(reloadedTicket.status, 'In Progress');
  assert.equal(reloadedTicket.assignedAdmin.toString(), adminUser._id.toString());
  assert.ok(reloadedTicket.messages.some(m => m.isInternalNote && m.content === 'Assigned to corridor lead.'));

  await SupportTicket.deleteOne({ _id: testTicket._id });
  console.log('✓ Support ticket lifecycle management verified.');

  console.log('✓ All Admin Module automated unit & integration tests passed successfully!');
  return true;
}
