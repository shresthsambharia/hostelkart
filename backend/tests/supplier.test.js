import { strict as assert } from 'assert';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
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
} from '../controllers/supplierController.js';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  getAdminSupplierProducts,
  updateSupplierProductApproval,
} from '../controllers/adminController.js';
import { getProducts, getProductById } from '../controllers/productController.js';

export async function runSupplierTests() {
  console.log('\n--- Running Supplier Unit & Integration Tests ---');

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

  // 10. Clean up test products
  await Product.deleteOne({ _id: createdProduct._id });
  console.log('✓ Cleanup completed');
  console.log('--- ALL SUPPLIER TESTS PASSED ---\n');
}
