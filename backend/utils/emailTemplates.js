const templateWrapper = (title, content) => {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
        <h1 style="color: #16a34a; margin: 0;">HostelKart</h1>
        <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">Scheduled Delivery to your room block</p>
      </div>
      <div style="padding: 20px 0;">
        <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
        ${content}
      </div>
      <div style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
        <p>HostelKart E-commerce Support &bull; Scheduled Delivery to your room block</p>
        <p>If you have any questions, reply to this email or reach us at <a href="mailto:supporthostelkart@gmail.com" style="color: #16a34a; text-decoration: none;">supporthostelkart@gmail.com</a>.</p>
      </div>
    </div>
  `;
};

export const getWelcomeEmail = (name) => {
  return templateWrapper(
    'Welcome to HostelKart!',
    `<p>Hello <strong>${name}</strong>,</p>
     <p>We are absolutely thrilled to welcome you to HostelKart! We deliver student essentials, snacks, and products directly to your hostel room floor.</p>
     <p>Get started by exploring our product catalog, placing an order, and earning loyalty cashback rewards on every purchase!</p>`
  );
};

export const getOrderConfirmationEmail = (orderId, amount, itemsList, otp, deliveryDetails) => {
  return templateWrapper(
    'Order Confirmed',
    `<p>Your order has been placed successfully and is being processed.</p>
     <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
       <p><strong>Order ID:</strong> #${orderId}</p>
       <p><strong>Total Amount:</strong> ₹${amount}</p>
       <p><strong>Delivery Address:</strong> Block ${deliveryDetails.block}, Room ${deliveryDetails.roomNumber}, ${deliveryDetails.hostelName}</p>
       <p style="font-size: 16px;"><strong>Delivery Verification OTP:</strong> <span style="font-size: 18px; font-weight: bold; color: #16a34a; background-color: #dcfce7; padding: 4px 8px; border-radius: 6px;">${otp}</span></p>
     </div>`
  );
};

export const getPaymentReceivedEmail = (orderId, amount, utr) => {
  return templateWrapper(
    'Payment Submitted',
    `<p>We have received your payment submission and started verification.</p>
     <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
       <p><strong>Order ID:</strong> #${orderId}</p>
       <p><strong>Payable Amount:</strong> ₹${amount}</p>
       <p><strong>Submitted UTR:</strong> ${utr}</p>
     </div>
     <p>A shop administrator is verifying the transaction reference. Your order status will update shortly once approved.</p>`
  );
};

export const getPaymentApprovedEmail = (orderId, amount) => {
  return templateWrapper(
    'Payment Approved & Verified',
    `<p>Your payment has been successfully verified! Your order is now confirmed and sent to our packing team.</p>
     <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
       <p><strong>Order ID:</strong> #${orderId}</p>
       <p><strong>Total Amount:</strong> ₹${amount}</p>
     </div>`
  );
};

export const getPaymentRejectedEmail = (orderId, reason) => {
  return templateWrapper(
    'Payment Verification Failed',
    `<p>Your payment verification for Order #${orderId} was rejected by the administrator.</p>
     <p><strong>Rejection Reason:</strong> ${reason || 'Invalid transaction UTR reference'}</p>
     <p>If you paid already, please submit a query through Custom Requests or contact support.</p>`
  );
};

export const getOrderShippedEmail = (orderId, riderName) => {
  return templateWrapper(
    'Order Out for Delivery!',
    `<p>Your order #${orderId} is out for delivery! A rider is heading to your hostel block room floor right now.</p>
     <p><strong>Delivery Rider:</strong> ${riderName || 'HostelKart Rider'}</p>
     <p>Please keep your verification OTP ready for the rider when they arrive.</p>`
  );
};

export const getOrderDeliveredEmail = (orderId) => {
  return templateWrapper(
    'Order Delivered Successfully',
    `<p>Your order #${orderId} has been successfully delivered to your room!</p>
     <p>Thank you for shopping with HostelKart! Leave a review on the products to share your feedback.</p>`
  );
};

export const getRefundApprovedEmail = (orderId, amount) => {
  return templateWrapper(
    'Refund Request Approved',
    `<p>Your refund request for Order #${orderId} has been approved and is being processed.</p>
     <p><strong>Refund Amount:</strong> ₹${amount}</p>`
  );
};

export const getRefundCompletedEmail = (orderId, amount, utr, method) => {
  return templateWrapper(
    'Refund Completed',
    `<p>Your refund for Order #${orderId} has been processed successfully!</p>
     <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
       <p><strong>Refund Amount:</strong> ₹${amount}</p>
       <p><strong>Refund Method:</strong> ${method || 'Wallet'}</p>
       <p><strong>Refund Reference:</strong> ${utr || 'N/A'}</p>
     </div>`
  );
};

export const getPasswordResetEmail = (resetUrl) => {
  return templateWrapper(
    'Password Reset Request',
    `<p>You requested a password reset for your HostelKart account.</p>
     <p>Click the link below to set a new password. The link is valid for 1 hour.</p>
     <p style="text-align: center; margin: 25px 0;">
       <a href="${resetUrl}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
     </p>`
  );
};

export const getTwoFactorEnabledEmail = (name) => {
  return templateWrapper(
    'Two-Factor Authentication Enabled',
    `<p>Hello <strong>${name}</strong>,</p>
     <p>Two-factor authentication (2FA) has been successfully enabled for your HostelKart account.</p>
     <p>You will now be prompted to enter a verification code from your authenticator app each time you sign in.</p>`
  );
};

export const getSecurityAlertEmail = (name, eventType, description) => {
  return templateWrapper(
    'Security Alert',
    `<p>Hello <strong>${name}</strong>,</p>
     <p>A security event occurred on your HostelKart account:</p>
     <div style="background-color: #fef2f2; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #fee2e2; color: #991b1b;">
       <p><strong>Event:</strong> ${eventType}</p>
       <p><strong>Description:</strong> ${description}</p>
     </div>
     <p>If this was not you, please reset your password immediately or contact support.</p>`
  );
};
