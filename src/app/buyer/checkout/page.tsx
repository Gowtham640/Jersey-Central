'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon, 
  MapPinIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

interface CheckoutItem {
  id: string;
  user_id: string;
  jersey_id: string;
  size: string;
  quantity: number;
  jersey: {
    id: string;
    title: string;
    price: number;
    image_url: string | string[];
    club: string;
    quality: string;
  };
}

interface ShippingDetails {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface User {
  id: string;
  email?: string;
}

export default function Checkout() {
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // Function to get first image URL from image_url field
  const getFirstImageUrl = (imageUrl: string | string[]): string => {
    if (!imageUrl) return "";
    try {
      const parsed = typeof imageUrl === "string" ? JSON.parse(imageUrl) : imageUrl;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
      return typeof imageUrl === "string" ? imageUrl : "";
    } catch {
      return typeof imageUrl === "string" ? imageUrl : "";
    }
  };

  useEffect(() => {
    // Get checkout items from localStorage
    const items = localStorage.getItem('checkoutItems');
    if (items) {
      setCheckoutItems(JSON.parse(items));
    } else {
      // Redirect to cart if no items
      router.push('/buyer/cart');
      return;
    }

    // Fetch current user session
    const getUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching user session:', error);
        return;
      }
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    };
    getUser();
  }, [router]);

  const handleInputChange = (field: keyof ShippingDetails, value: string) => {
    setShippingDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const requiredFields: (keyof ShippingDetails)[] = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const field of requiredFields) {
      if (!shippingDetails[field].trim()) {
        toast.error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        return false;
      }
    }
    return true;
  };

  const placeOrder = async () => {
    if (!validateForm()) return;
    if (!user) {
      toast.error('Please login to place order');
      return;
    }

    setLoading(true);
    try {
      // Calculate totals
      const subtotal = checkoutItems.reduce((sum, item) => sum + (item.jersey.price * item.quantity), 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: subtotal,
          shipping_address: JSON.stringify(shippingDetails),
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        toast.error('Failed to create order');
        return;
      }

      // Create order items
      const orderItems = checkoutItems.map(item => ({
        order_id: order.id,
        jersey_id: item.jersey_id,
        size: item.size,
        quantity: item.quantity,
        price: item.jersey.price
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (orderItemsError) {
        console.error('Error creating order items:', orderItemsError);
        toast.error('Failed to create order items');
        return;
      }
      for (const item of checkoutItems) {
        // Fetch stock for the specific jersey & size
        const { data: stockRow, error: fetchError } = await supabase
          .from('jersey_stock')
          .select('stock')
          .eq('jersey_id', item.jersey_id)
          .eq('size', item.size)
          .single();
      
        if (!fetchError && stockRow) {
          const newStock = Math.max(0, stockRow.stock - item.quantity);
      
          // Update stock for that jersey + size
          const { error: updateError } = await supabase
            .from('jersey_stock')
            .update({ stock: newStock })
            .eq('jersey_id', item.jersey_id)
            .eq('size', item.size);
      
          if (updateError) {
            console.error(`Failed to update stock for ${item.jersey_id} (${item.size}):`, updateError);
          }
        } else {
          console.error(`Stock fetch failed for ${item.jersey_id} (${item.size}):`, fetchError);
        }
      }

      // Remove items from cart
      const cartItemIds = checkoutItems.map(item => item.id);
      const { error: cartError } = await supabase
        .from('cart_items')
        .delete()
        .in('id', cartItemIds);

      if (cartError) {
        console.error('Error clearing cart:', cartError);
        // Non-blocking
      }

      // Clear localStorage
      localStorage.removeItem('checkoutItems');

      // Redirect to payment verification page
      toast.success('Order created. Redirecting to payment verification.');
      router.push(`/buyer/verification?order_id=${order.id}`);
    } catch (error) {
      console.error('Error in placeOrder:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing order...</p>
        </div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No items to checkout</p>
          <Link href="/buyer/cart" className="text-green-600 hover:text-green-700 mt-2 inline-block">
            Return to Cart
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = checkoutItems.reduce((sum, item) => sum + (item.jersey.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/buyer/cart" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Checkout</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Details Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <MapPinIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Shipping Details</h2>
              </div>
              
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={shippingDetails.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={shippingDetails.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={shippingDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    value={shippingDetails.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="Enter your full address"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={shippingDetails.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={shippingDetails.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                    <input
                      type="text"
                      value={shippingDetails.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border-0 p-6 sticky top-8">
              <div className="flex items-center space-x-3 mb-6">
                <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
              </div>
              
              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={getFirstImageUrl(item.jersey.image_url)}
                      alt={item.jersey.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.jersey.title}</h3>
                      <p className="text-sm text-gray-600">{item.jersey.club} - {item.jersey.quality}</p>
                      <p className="text-sm text-gray-600">Size: {item.size} x{item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{item.jersey.price * item.quantity}</p>
                      <p className="text-sm text-gray-600">₹{item.jersey.price} each</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-semibold text-gray-900">₹{subtotal}</span>
                  </div>
                </div>
              </div>
              
              {/* Place Order Button */}
              <button
                onClick={placeOrder}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Place Order - ₹{subtotal}
              </button>
              
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>By placing this order, you agree to our terms and conditions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
