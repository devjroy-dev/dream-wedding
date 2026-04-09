import RazorpayCheckout from 'react-native-razorpay';

const RAZORPAY_KEY_ID = 'rzp_test_SbVYhhnEvEr6Xe';

export interface PaymentOptions {
  amount: number; // in rupees
  vendorName: string;
  description: string;
  userName: string;
  userPhone: string;
  userEmail?: string;
}

export const initiatePayment = async (options: PaymentOptions): Promise<any> => {
  const razorpayOptions = {
    description: options.description,
    image: 'https://i.imgur.com/3g7nmJC.png',
    currency: 'INR',
    key: RAZORPAY_KEY_ID,
    amount: options.amount * 100, // convert to paise
    name: 'The Dream Wedding',
    prefill: {
      email: options.userEmail || '',
      contact: options.userPhone,
      name: options.userName,
    },
    theme: { color: '#2C2420' },
    notes: {
      vendor_name: options.vendorName,
      platform: 'The Dream Wedding',
    },
  };

  return new Promise((resolve, reject) => {
    RazorpayCheckout.open(razorpayOptions)
      .then((data: any) => {
        resolve(data);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
};

export const BOOKING_PROTECTION_FEE = 999;
export const PLATFORM_FEE_PERCENT = 0.02;

export const calculatePlatformFee = (amount: number): number => {
  return Math.round(amount * PLATFORM_FEE_PERCENT);
};
