import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const testRazorpay = async () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  console.log('Testing Key ID:', key_id);
  console.log('Testing Key Secret:', key_secret ? key_secret.substring(0, 5) + '...' : 'undefined');

  const razorpay = new Razorpay({
    key_id,
    key_secret
  });

  try {
    console.log('Creating Razorpay order...');
    const order = await razorpay.orders.create({
      amount: 100, // paise
      currency: 'INR',
      receipt: 'test_rcpt_new'
    });
    console.log('SUCCESS! Response order:', order);
  } catch (error) {
    console.error('ERROR OCCURRED:');
    console.error(error);
  }
};

testRazorpay();
