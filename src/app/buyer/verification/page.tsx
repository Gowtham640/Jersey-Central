'use client';

import { useState, useEffect, Suspense } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

interface OrderData {
  id: string;
  total_amount: number;
  shipping_address: string;
}

function PaymentVerificationContent() {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (!orderId) {
      toast.error('No order ID provided');
      router.push('/buyer/cart');
      return;
    }

    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select('id, total_amount, shipping_address')
          .eq('id', orderId)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          toast.error('Failed to fetch order details');
          router.push('/buyer/cart');
          return;
        }

        setOrderData(data);
      } catch (error) {
        console.error('Error in fetchOrderData:', error);
        toast.error('Failed to fetch order details');
        router.push('/buyer/cart');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [searchParams, router]);

  const generateUPILink = (amount: number) => {
    // Generate UPI link for payment
    const transactionNote = `Payment for Order #${orderData?.id}`;
    
    return `upi://pay?pa=grizigowtham@okhdfcbank&pn=Gowtham%20Ramakrishna%20Rayapureddi&aid=uGICAgIDjkPzTJw&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
  };

  const handlePaymentDone = () => {
    toast.success('Thanks for purchasing!');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Order not found</p>
          <Link href="/buyer/cart" className="text-green-600 hover:text-green-700 mt-2 inline-block">
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  const upiLink = generateUPILink(orderData.total_amount);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/buyer/checkout" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Payment Verification</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border-0 p-8 text-center">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Payment</h2>
            <p className="text-gray-600">Scan the QR code below to pay</p>
          </div>

          {/* QR Code */}
          <div className="mb-6 flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              <QRCodeSVG
                value={upiLink}
                size={200}
                level="M"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              Pay to Jersey Central
            </p>
            <p className="text-2xl font-bold text-green-600">
              ₹{orderData.total_amount}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Order ID: #{orderData.id}
            </p>
          </div>

          {/* Done Button */}
          <button
            onClick={handlePaymentDone}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Done
          </button>

          <div className="mt-4 text-sm text-gray-600">
            <p>After completing payment, click &quot;Done&quot; to confirm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentVerification() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentVerificationContent />
    </Suspense>
  );
}