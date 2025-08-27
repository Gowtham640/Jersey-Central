'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  MinusIcon, 
  PlusIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  user_id: string;
  jersey_id: string;
  size: string;
  quantity: number;
  created_at: string;
  jersey: {
    id: string;
    title: string;
    price: number;
    image_url: string | string[];
    club: string;
    quality: string;
  };
}

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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

  // Fetch cart items for the current user
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCartItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          jersey:jerseys(id, title, price, image_url, club, quality)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cart items:', error);
        toast.error('Failed to fetch cart items');
        return;
      }

      setCartItems(data || []);
      
      // Select all items by default
      if (data && data.length > 0) {
        setSelectedItems(new Set(data.map(item => item.id)));
      }
    } catch (error) {
      console.error('Error in fetchCartItems:', error);
      toast.error('Failed to fetch cart items');
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);

      if (error) {
        console.error('Error updating quantity:', error);
        toast.error('Failed to update quantity');
        return;
      }

      setCartItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));

      toast.success('Quantity updated');
    } catch (error) {
      console.error('Error in updateQuantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error removing item:', error);
        toast.error('Failed to remove item');
        return;
      }

      setCartItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error in removeItem:', error);
      toast.error('Failed to remove item');
    }
  };

  // Calculate totals for selected items
  const selectedItemsData = cartItems.filter(item => selectedItems.has(item.id));
  const subtotal = selectedItemsData.reduce((sum, item) => sum + (item.jersey.price * item.quantity), 0);

  // Proceed to checkout
  const proceedToCheckout = () => {
    if (selectedItemsData.length === 0) {
      toast.error('Please select items to checkout');
      return;
    }
    
    // Store selected items in localStorage for checkout page
    localStorage.setItem('checkoutItems', JSON.stringify(selectedItemsData));
    router.push('/buyer/checkout');
  };

  useEffect(() => {
    fetchCartItems();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-black shadow-sm border-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link href="/" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Shopping Cart</h1>
            </div>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <ShoppingBagIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Shopping Cart</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border-0 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cart Items ({cartItems.length})</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedItems);
                        if (e.target.checked) {
                          newSelected.add(item.id);
                        } else {
                          newSelected.delete(item.id);
                        }
                        setSelectedItems(newSelected);
                      }}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    
                    <img
                      src={getFirstImageUrl(item.jersey.image_url)}
                      alt={item.jersey.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.jersey.title}</h3>
                      <p className="text-sm text-gray-600">{item.jersey.club} - {item.jersey.quality}</p>
                      <p className="text-sm text-gray-600">Size: {item.size}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{item.jersey.price * item.quantity}</p>
                      <p className="text-sm text-gray-600">₹{item.jersey.price} each</p>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border-0 p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">Free</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-semibold text-gray-900">₹{subtotal}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={proceedToCheckout}
                disabled={selectedItems.size === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Proceed to Checkout ({selectedItems.size} items)
              </button>
              
              <div className="mt-4 text-sm text-gray-600 text-center">
                <p>Selected {selectedItems.size} of {cartItems.length} items</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
