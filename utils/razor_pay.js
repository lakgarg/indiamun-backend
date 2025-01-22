// filepath: /Users/sarveshdakhore/Desktop/indiaMUN_back/utils/razor_pay.js
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (amount, currency = 'INR', receipt) => {
  const options = {
    amount: amount * 100, // amount in the smallest currency unit
    currency,
    receipt,
  };


  try {
    const order = await razorpay.orders.create(options);
    
    return order;
  } catch (error) {
    throw new Error('Error creating Razorpay order');
  }
};