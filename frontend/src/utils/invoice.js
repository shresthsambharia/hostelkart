import { getThumbnail } from './image';

const loadJsPDF = () => {
  return new Promise((resolve) => {
    if (window.jspdf) {
      resolve(window.jspdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      resolve(window.jspdf);
    };
    document.head.appendChild(script);
  });
};

// Helper to fetch and base64 compile image with a 600ms timeout
const getBase64ImageFromUrl = (url) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 600); // 600ms timeout
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      clearTimeout(timer);
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 40, 40);
      ctx.drawImage(img, 0, 0, 40, 40);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
  });
};

export const downloadInvoice = async (order, loggedInUser) => {
  try {
    const jspdfModule = await loadJsPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // A4: 210mm wide x 297mm high

    // Design Tokens & Colors
    const primaryColor = '#4f46e5'; // Indigo
    const primaryLightColor = '#f5f3ff';
    const successColor = '#10b981'; // Emerald
    const darkColor = '#1e293b'; // Slate 800
    const grayColor = '#64748b'; // Slate 500
    const lightGrayColor = '#f8fafc'; // Slate 50
    const borderGrayColor = '#e2e8f0'; // Slate 200

    // 1. Header Banner (Top accent line)
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 4, 'F');

    // 2. Draw Vector Logo Graphic
    doc.setFillColor(primaryColor);
    doc.rect(15, 12, 10, 10, 'F'); // Draw solid indigo square
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('HK', 18, 19); // White initials in logo box

    // 3. Draw Brand Name & Subtext
    doc.setTextColor(primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('HostelKart', 28, 19);

    doc.setTextColor(grayColor);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Daily Hostel Essentials Delivered in 30 Mins', 28, 23);

    // 4. Invoice Header
    doc.setTextColor(darkColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('TAX INVOICE', 195, 20, { align: 'right' });

    // Horizontal separator
    doc.setDrawColor(borderGrayColor);
    doc.line(15, 28, 195, 28);

    // 5. Section: Invoice Meta Details (Left side) & Customer Details (Right side)
    let y = 35;
    
    // Left side: Invoice Info
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor);
    doc.setFontSize(9);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice No:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`INV-HK-${order._id.substring(12).toUpperCase()}`, 42, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Order ID:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${order._id.toUpperCase()}`, 42, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.createdAt).toLocaleDateString(), 42, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Delivery Date:', 15, y);
    doc.setFont('helvetica', 'normal');
    let deliveryDateStr = 'Estimated: ' + order.deliverySlot;
    if (order.orderStatus === 'Delivered') {
      const delTimestamp = order.deliveredAt || order.timeline?.find(t => t.status === 'Delivered')?.timestamp;
      deliveryDateStr = delTimestamp ? new Date(delTimestamp).toLocaleDateString() : new Date(order.updatedAt).toLocaleDateString();
    }
    doc.text(deliveryDateStr, 42, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(order.paymentMethod === 'ONLINE' ? 'Online UPI/Card' : 'Cash on Delivery (COD)', 42, y);

    y += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Status:', 15, y);
    doc.setFont('helvetica', 'bold');
    if (order.paymentStatus === 'Paid' || order.paymentStatus === 'PAID') {
      doc.setTextColor(successColor);
    } else {
      doc.setTextColor('#d97706'); // Amber
    }
    doc.text(order.paymentStatus.toUpperCase(), 42, y);
    doc.setTextColor(darkColor); // restore

    // Right side: Delivery details (Reset y to 35 for right column alignment)
    let ry = 35;
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVERY ADDRESS & CUSTOMER', 115, ry);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor);
    doc.setFontSize(9);
    ry += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Customer:', 115, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(loggedInUser?.name || order.user?.name || 'Student', 145, ry);

    ry += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Mobile Number:', 115, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(order.deliveryDetails?.phone || 'N/A', 145, ry);

    ry += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Room Details:', 115, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(`Room ${order.deliveryDetails?.roomNumber}, Floor ${order.deliveryDetails?.floor || 'N/A'}`, 145, ry);

    ry += 5.5;
    doc.setFont('helvetica', 'bold');
    doc.text('Hostel Address:', 115, ry);
    doc.setFont('helvetica', 'normal');
    const hostelAddress = `${order.deliveryDetails?.hostelName}, Block ${order.deliveryDetails?.block}`;
    doc.text(hostelAddress, 145, ry, { maxWidth: 50 });

    // Table placement y position
    y = Math.max(y, ry) + 15;

    // 6. Section: Products Table Header
    doc.setFillColor(primaryColor);
    doc.rect(15, y, 180, 8, 'F');
    
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Img', 17, y + 5.5);
    doc.text('Product Description', 32, y + 5.5);
    doc.text('Qty', 117, y + 5.5);
    doc.text('Unit Price', 137, y + 5.5);
    doc.text('Total Price', 167, y + 5.5);

    y += 8;

    // Table items loop
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      
      // Calculate dynamic row height with wrapped text
      const splitName = doc.splitTextToSize(item.name, 75);
      const rowHeight = Math.max(16, splitName.length * 4.5 + 6);

      // Check page overflow
      if (y + rowHeight > 270) {
        doc.addPage();
        // Draw header banner and table header again
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, 210, 4, 'F');
        
        y = 15;
        doc.setFillColor(primaryColor);
        doc.rect(15, y, 180, 8, 'F');
        doc.setTextColor('#ffffff');
        doc.setFont('helvetica', 'bold');
        doc.text('Img', 17, y + 5.5);
        doc.text('Product Description', 32, y + 5.5);
        doc.text('Qty', 117, y + 5.5);
        doc.text('Unit Price', 137, y + 5.5);
        doc.text('Total Price', 167, y + 5.5);
        
        y += 8;
        doc.setFont('helvetica', 'normal');
      }

      // Alternating row background fills
      if (i % 2 === 1) {
        doc.setFillColor(lightGrayColor);
        doc.rect(15, y, 180, rowHeight, 'F');
      }

      // Render Thumbnail (fetch optimized webp or draw fallback box)
      const thumbUrl = getThumbnail(item.product || item);
      const base64 = await getBase64ImageFromUrl(thumbUrl);

      if (base64) {
        doc.addImage(base64, 'JPEG', 16, y + (rowHeight - 12) / 2, 12, 12);
      } else {
        // Draw nice gray circle fallback with first letter
        doc.setFillColor('#e2e8f0');
        doc.circle(22, y + rowHeight / 2, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(grayColor);
        doc.text(item.name.charAt(0).toUpperCase(), 20.5, y + rowHeight / 2 + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Print wrapped text descriptions
      doc.setTextColor(darkColor);
      doc.text(splitName, 32, y + (rowHeight - (splitName.length * 4.5)) / 2 + 3);

      // Qty, Unit Price, Total Price
      const discount = item.discount || 0;
      const discountedPrice = Math.round(item.price * (1 - discount / 100));
      const itemTotal = discountedPrice * item.quantity;

      doc.text(item.quantity.toString(), 120, y + rowHeight / 2 + 1.5);
      doc.text(`INR ${discountedPrice}`, 137, y + rowHeight / 2 + 1.5);
      doc.text(`INR ${itemTotal}`, 167, y + rowHeight / 2 + 1.5);

      // Draw light bottom border line
      doc.setDrawColor('#f1f5f9');
      doc.line(15, y + rowHeight, 195, y + rowHeight);

      y += rowHeight;
    }

    // Check height before printing summary
    if (y + 60 > 270) {
      doc.addPage();
      doc.setFillColor(primaryColor);
      doc.rect(0, 0, 210, 4, 'F');
      y = 15;
    }

    // 7. Section: Bill summary
    y += 8;
    
    const subtotalVal = order.items.reduce((acc, it) => {
      const disc = it.discount || 0;
      const dPrice = Math.round(it.price * (1 - disc / 100));
      return acc + dPrice * it.quantity;
    }, 0);

    const itemsTotalBeforeDiscounts = order.items.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const itemsSavingsFromDiscounts = itemsTotalBeforeDiscounts - subtotalVal;

    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & SUPPORT', 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(grayColor);
    doc.text('• This is a computer-generated digital tax invoice.', 15, y + 5);
    doc.text('• Direct door delivery to student hostel floor.', 15, y + 9);
    doc.text(`• Support: supporthostelkart@gmail.com | +91 98765 43210`, 15, y + 13);
    doc.text('• Thank you for ordering with HostelKart!', 15, y + 17);

    // Right Column: Summary
    let sy = y;
    doc.setFontSize(8.5);
    doc.setTextColor(grayColor);
    
    doc.text('Items Subtotal:', 125, sy);
    doc.setTextColor(darkColor);
    doc.text(`INR ${itemsTotalBeforeDiscounts}`, 170, sy);

    if (itemsSavingsFromDiscounts > 0) {
      sy += 5;
      doc.setTextColor(grayColor);
      doc.text('Product Discounts:', 125, sy);
      doc.setTextColor(successColor);
      doc.text(`-INR ${itemsSavingsFromDiscounts}`, 170, sy);
    }

    if (order.discountAmount > 0) {
      sy += 5;
      doc.setTextColor(grayColor);
      doc.text('Coupon Discount:', 125, sy);
      doc.setTextColor(successColor);
      doc.text(`-INR ${order.discountAmount}`, 170, sy);
    }

    if (order.walletPaidAmount > 0) {
      sy += 5;
      doc.setTextColor(grayColor);
      doc.text('Wallet Applied:', 125, sy);
      doc.setTextColor(primaryColor);
      doc.text(`-INR ${order.walletPaidAmount}`, 170, sy);
    }

    sy += 5;
    doc.setTextColor(grayColor);
    doc.text('Delivery Charges:', 125, sy);
    doc.setTextColor(darkColor);
    doc.text(order.deliveryCharge === 0 ? 'FREE' : `INR ${order.deliveryCharge}`, 170, sy);

    sy += 5;
    doc.setTextColor(grayColor);
    doc.text('Platform Fees:', 125, sy);
    doc.setTextColor(darkColor);
    doc.text(`INR ${order.platformFee !== undefined ? order.platformFee : 15}`, 170, sy);

    // GST calculation for display (5% Included)
    const gstVal = Math.round(order.totalAmount * 0.05);
    sy += 5;
    doc.setTextColor(grayColor);
    doc.text('GST (5% Included):', 125, sy);
    doc.text(`INR ${gstVal}`, 170, sy);

    // Highlight Grand Total
    sy += 6;
    doc.setFillColor(primaryLightColor);
    doc.rect(123, sy - 4.5, 72, 7.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor);
    doc.text('Grand Total:', 125, sy);
    doc.text(`INR ${order.totalAmount}`, 170, sy);

    // Branding Footer note at bottom page border
    doc.setTextColor(grayColor);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for ordering with HostelKart', 105, 285, { align: 'center' });

    // 8. Output/Save PDF
    const filename = `HostelKart-Invoice-HK${order._id.substring(12).toUpperCase()}.pdf`;
    
    // Cross-platform mobile fallback helper
    doc.save(filename);
  } catch (err) {
    console.error('[Invoice Generation Error]', err);
    alert('Failed to generate or download PDF invoice.');
  }
};
