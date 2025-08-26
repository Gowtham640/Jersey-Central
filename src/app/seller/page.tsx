'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon, EyeIcon, ChartBarIcon, UserIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { supabase } from '../supabase-client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface QuickStats {
  totalProducts: number;
  activeOrders: number;
  thisMonthSales: number;
}

interface OrderItem {
  order_id: string;
  price: number;
  quantity: number;
  created_at: string;
  jerseys: {
    seller_id: string;
  }[];
}

interface ProcessedOrder {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
}

export default function SellerDashboard() {
  const router=useRouter();
  const [showOrdersPopup, setShowOrdersPopup] = useState(false);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalProducts: 0,
    activeOrders: 0,
    thisMonthSales: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchQuickStats = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Fetch seller's products count
      const { data: products, error: productsError } = await supabase
        .from('jerseys')
        .select('id')
        .eq('seller_id', user.id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      // Fetch seller's orders count through jerseys
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          created_at, 
          status,
          order_items!inner(
            jersey_id,
            price,
            quantity
          )
        `)
        .eq('order_items.jersey_id', supabase
          .from('jerseys')
          .select('id')
          .eq('seller_id', user.id)
        );

      if (ordersError) {
        // Silently handle error without logging
        // Try alternative approach - fetch orders through order_items and jerseys
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select(`
            order_id, 
            price, 
            quantity, 
            created_at,
            jerseys!inner(seller_id)
          `)
          .eq('jerseys.seller_id', user.id);
        
        if (orderItemsError) {
          // Silently handle error without logging
        } else if (orderItems) {
          // Group by order_id to get unique orders
          const uniqueOrders = orderItems.reduce((acc: ProcessedOrder[], item: OrderItem) => {
            if (!acc.find(o => o.id === item.order_id)) {
              acc.push({
                id: item.order_id,
                total_amount: item.price * item.quantity,
                created_at: item.created_at,
                status: 'pending' // Default status
              });
            }
            return acc;
          }, []);
          
          // Use the processed order data
          const totalProducts = products ? products.length : 0;
          const activeOrders = uniqueOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
          
          const now = new Date();
          const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
          const thisMonthSales = uniqueOrders
            .filter(order => new Date(order.created_at) >= monthAgo)
            .reduce((sum, order) => sum + (order.total_amount || 0), 0);

          setQuickStats({
            totalProducts,
            activeOrders,
            thisMonthSales
          });
          return;
        }
      }

      // Calculate stats from orders table
      const totalProducts = products ? products.length : 0;
      const activeOrders = orders ? orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length : 0;
      
      // Calculate this month's sales
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthSales = orders ? orders
        .filter(order => new Date(order.created_at) >= monthAgo)
        .reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0;

      setQuickStats({
        totalProducts,
        activeOrders,
        thisMonthSales
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-sans font-bold text-white">Seller Dashboard</h1>
            <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
            >Go to home
            </button>
              <button
                onClick={() => setShowOrdersPopup(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <ShoppingCartIcon className="h-5 w-5" />
                <span>Orders</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Popup */}
      {showOrdersPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Dashboard</h3>
            <p className="text-gray-600 mb-4">View and manage all your orders</p>
            <div className="flex space-x-3">
              <Link
                href="/seller/orders"
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-center hover:bg-green-700 transition-colors"
              >
                View Orders
              </Link>
              <button
                onClick={() => setShowOrdersPopup(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Add Product */}
          <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl border-0 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <PlusIcon className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Add Product</h2>
            </div>
            <p className="text-gray-600 mb-4">Upload new jerseys to your inventory</p>
            <Link
              href="/seller/add-product"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Jersey
            </Link>
          </div>

          {/* 2. View/Edit/Delete Listings */}
          <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl border-0 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <EyeIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Manage Listings</h2>
            </div>
            <p className="text-gray-600 mb-4">View, edit, or delete your current products</p>
            <Link
              href="/seller/listings"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Listings
            </Link>
          </div>

          {/* 4. Analytics */}
          <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl border-0 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
            </div>
            <p className="text-gray-600 mb-4">View your sales performance and insights</p>
            <Link
              href="/seller/analytics"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>

          {/* 5. Profile & Bank Details */}
          <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl border-0 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <UserIcon className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Profile & Payments</h2>
            </div>
            <p className="text-gray-600 mb-4">Manage your profile and payment details</p>
            <Link
              href="/seller/profile"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Edit Profile
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-lg hover:shadow-2xl border-0 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
            {loading ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-semibold">Loading...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-semibold text-orange-600">Loading...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">This Month Sales:</span>
                  <span className="font-semibold text-green-600">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products:</span>
                  <span className="font-semibold">{quickStats.totalProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-semibold text-orange-600">{quickStats.activeOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">This Month Sales:</span>
                  <span className="font-semibold text-green-600">₹{quickStats.thisMonthSales.toLocaleString()}</span>
                </div>
              </div>
            )}
            <button
              onClick={fetchQuickStats}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Refresh Stats
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}