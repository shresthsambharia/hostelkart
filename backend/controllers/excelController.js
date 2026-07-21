import asyncHandler from 'express-async-handler';
import XLSX from 'xlsx';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Category from '../models/Category.js';

// Helper to construct and send XLSX buffer response
const sendExcelFile = (res, data, sheetName, filename) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// @desc    Export products list to Excel
// @route   GET /api/admin/excel/export-products
// @access  Private/Admin
const exportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).lean();
  
  const data = products.map(p => ({
    'ID': p._id.toString(),
    'Name': p.name,
    'Category': p.category,
    'Price (INR)': p.price,
    'Discount (%)': p.discount,
    'Stock': p.stock,
    'Rating': p.rating,
    'Reviews Count': p.numReviews,
    'Delivery Time': p.deliveryTime,
    'Available': p.isAvailable ? 'Yes' : 'No',
    'Created At': p.createdAt
  }));

  sendExcelFile(res, data, 'Products', 'HostelKart_Products.xlsx');
});

// @desc    Export orders log to Excel
// @route   GET /api/admin/excel/export-orders
// @access  Private/Admin
const exportOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'name email').lean();
  
  const data = orders.map(o => ({
    'Order ID': o._id.toString(),
    'Customer Name': o.user?.name || 'Guest/Deleted',
    'Customer Email': o.user?.email || 'N/A',
    'Hostel': o.deliveryDetails?.hostelName || '',
    'Room': o.deliveryDetails?.roomNumber || '',
    'Total Amount': o.totalAmount,
    'Coupon Discount': o.discountAmount,
    'Wallet Paid': o.walletPaidAmount,
    'Payment Method': o.paymentMethod,
    'Payment Status': o.paymentStatus,
    'Order Status': o.orderStatus,
    'Delivered At': o.deliveredAt || 'Not Delivered',
    'Created At': o.createdAt
  }));

  sendExcelFile(res, data, 'Orders', 'HostelKart_Orders.xlsx');
});

// @desc    Export customers list to Excel
// @route   GET /api/admin/excel/export-customers
// @access  Private/Admin
const exportCustomers = asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'student' }).lean();
  
  const data = customers.map(c => ({
    'User ID': c._id.toString(),
    'Name': c.name,
    'Email': c.email,
    'Wallet Balance': c.walletBalance,
    'Loyalty Level': c.loyaltyLevel || 'Bronze',
    'Referrals Count': c.referralsCount || 0,
    'Created At': c.createdAt
  }));

  sendExcelFile(res, data, 'Customers', 'HostelKart_Customers.xlsx');
});

// @desc    Export revenue metrics to Excel
// @route   GET /api/admin/excel/export-revenue
// @access  Private/Admin
const exportRevenue = asyncHandler(async (req, res) => {
  // Aggregate sales by Category
  const orders = await Order.find({ orderStatus: 'Delivered' }).lean();
  
  const categoryRevenue = {};
  const dailyRevenue = {};
  let totalSales = 0;

  orders.forEach(o => {
    totalSales += o.totalAmount;
    
    // Group by day (YYYY-MM-DD)
    const day = new Date(o.createdAt).toISOString().split('T')[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + o.totalAmount;

    // Group items by category
    o.items.forEach(item => {
      // Find category of product by loading category string or name from item
      // Product schema holds a string category field
      // We can aggregate category stats directly
      const cat = item.category || 'General';
      const itemRev = item.price * item.quantity;
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + itemRev;
    });
  });

  // Since items might not store category on the orderItem itself, let's also aggregate category from Products
  // Let's populate the items products categories if not available
  const productCategories = {};
  const products = await Product.find({}).select('category').lean();
  products.forEach(p => { productCategories[p._id.toString()] = p.category; });

  const correctedCategoryRevenue = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const cat = productCategories[item.product?.toString()] || 'General';
      const itemRev = item.price * item.quantity;
      correctedCategoryRevenue[cat] = (correctedCategoryRevenue[cat] || 0) + itemRev;
    });
  });

  const dailyData = Object.keys(dailyRevenue).map(day => ({
    'Date': day,
    'Revenue (INR)': dailyRevenue[day]
  })).sort((a, b) => b.Date.localeCompare(a.Date));

  const categoryData = Object.keys(correctedCategoryRevenue).map(cat => ({
    'Category': cat,
    'Revenue (INR)': correctedCategoryRevenue[cat]
  }));

  const wb = XLSX.utils.book_new();
  
  const ws1 = XLSX.utils.json_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Daily Revenue');
  
  const ws2 = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Category Revenue');
  
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="HostelKart_Revenue.xlsx"');
  res.send(buffer);
});

// @desc    Bulk import new products from Excel
// @route   POST /api/admin/excel/import-products
// @access  Private/Admin
const importProducts = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    res.status(400);
    throw new Error('The uploaded Excel sheet is empty');
  }

  let importedCount = 0;
  let errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row['Name'] || row['name'];
    const image = row['Image'] || row['image'] || 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg';
    const description = row['Description'] || row['description'] || 'No description provided';
    const price = Number(row['Price'] || row['Price (INR)'] || row['price']);
    const discount = Number(row['Discount'] || row['Discount (%)'] || row['discount'] || 0);
    const category = row['Category'] || row['category'];
    const stock = Number(row['Stock'] || row['stock'] || 0);
    const deliveryTime = row['Delivery Time'] || row['deliveryTime'] || '30 mins';

    if (!name || isNaN(price) || !category) {
      errors.push(`Row ${i + 2}: Missing required fields or price is invalid (Name, Price, Category required)`);
      continue;
    }

    try {
      // Find category or create it
      const categoryExists = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
      if (!categoryExists) {
        await Category.create({
          name: category,
          image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg'
        });
      }

      const normalizedName = name.trim().toLowerCase();
      const existingProduct = await Product.findOne({
        $or: [
          { normalizedName },
          { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }
        ]
      });

      if (existingProduct) {
        existingProduct.price = price;
        existingProduct.stock = stock;
        existingProduct.discount = discount;
        existingProduct.description = description;
        existingProduct.image = image;
        existingProduct.category = category;
        existingProduct.deliveryTime = deliveryTime;
        existingProduct.isAvailable = stock > 0;
        existingProduct.normalizedName = normalizedName;
        await existingProduct.save();
      } else {
        await Product.create({
          name: name.trim(),
          normalizedName,
          image,
          description,
          price,
          discount,
          category,
          stock,
          deliveryTime,
          isAvailable: stock > 0
        });
      }
      importedCount++;
    } catch (err) {
      errors.push(`Row ${i + 2}: Database error - ${err.message}`);
    }
  }

  res.status(200).json({
    message: `Import complete. Successfully imported ${importedCount} products.`,
    errors
  });
});

// @desc    Bulk update inventory / stocks from Excel
// @route   POST /api/admin/excel/bulk-inventory
// @access  Private/Admin
const bulkInventoryUpdate = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    res.status(400);
    throw new Error('The uploaded Excel sheet is empty');
  }

  let updatedCount = 0;
  let errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const productId = row['ID'] || row['Id'] || row['id'] || row['Product ID'];
    const name = row['Name'] || row['name'];
    const stock = row['Stock'] || row['stock'];
    const price = row['Price'] || row['Price (INR)'] || row['price'];

    if (!productId && !name) {
      errors.push(`Row ${i + 2}: Product ID or Product Name is required to update`);
      continue;
    }

    try {
      let product = null;
      if (productId) {
        product = await Product.findById(productId);
      } else {
        product = await Product.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      }

      if (!product) {
        errors.push(`Row ${i + 2}: Product not found (ID: ${productId || 'N/A'}, Name: ${name || 'N/A'})`);
        continue;
      }

      let changes = false;
      if (stock !== undefined && !isNaN(Number(stock))) {
        product.stock = Number(stock);
        product.isAvailable = product.stock > 0;
        changes = true;
      }

      if (price !== undefined && !isNaN(Number(price))) {
        product.price = Number(price);
        changes = true;
      }

      if (changes) {
        await product.save();
        updatedCount++;
      }
    } catch (err) {
      errors.push(`Row ${i + 2}: Error saving product updates - ${err.message}`);
    }
  }

  res.status(200).json({
    message: `Inventory update complete. Updated ${updatedCount} products.`,
    errors
  });
});

// @desc    Export payments log to Excel
// @route   GET /api/admin/excel/export-payments
// @access  Private/Admin
const exportPayments = asyncHandler(async (req, res) => {
  const orders = await Order.find({ paymentMethod: 'UPI' }).populate('user', 'name email').lean();

  const data = orders.map(o => ({
    'Order ID': o._id.toString(),
    'Customer Name': o.user?.name || 'Guest/Deleted',
    'Customer Email': o.user?.email || 'N/A',
    'Payment Reference': o.paymentReference || 'N/A',
    'UTR Number': o.utrNumber || 'N/A',
    'Total Amount': o.totalAmount,
    'Payment Status': o.paymentStatus,
    'Order Status': o.orderStatus,
    'Submitted At': o.paymentSubmittedAt ? new Date(o.paymentSubmittedAt).toLocaleString() : 'N/A',
    'Verified At': o.paymentVerifiedAt ? new Date(o.paymentVerifiedAt).toLocaleString() : 'N/A',
  }));

  sendExcelFile(res, data, 'Payments', 'HostelKart_Payments.xlsx');
});

export {
  exportProducts,
  exportOrders,
  exportCustomers,
  exportRevenue,
  exportPayments,
  importProducts,
  bulkInventoryUpdate
};
