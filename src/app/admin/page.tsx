'use client';

import { 
  UsersIcon, 
  CubeIcon, 
  ShoppingCartIcon, 
  ChartBarIcon, 
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect,useState } from "react";
import { supabase } from ".././supabase-client";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';

interface SellerRequest {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  instagram_link: string;
  whatsapp_number: string;
  store_name: string;
  address: string;
  productsCount?: number;
  totalSales?: number;
}

interface QuickStats {
  totalSellers: number;
  pendingApprovals: number;
  activeSellers: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerRequest | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalSellers: 0,
    pendingApprovals: 0,
    activeSellers: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const router=useRouter();
  const fetchSellerRequests = async () => {
    const { data, error } = await supabase
      .from('seller_requests')
      .select('*');
    if (error) {
      console.error("Error fetching seller requests:", error.message);
      toast.error("Failed to load seller requests");
    } else {
      const enrichedData = data.map((seller) => ({
        ...seller,
        productsCount: seller.productsCount ?? 0,
        totalSales: seller.totalSales ?? 0
      }));
      setSellerRequests(enrichedData);
    }
  };

  const fetchQuickStats = async () => {
    try {
      // Fetch orders for revenue and order count
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }

      // Calculate total revenue from orders
      const totalRevenue = orders ? orders.reduce((sum: number, order: any) => {
        const orderTotal = order.order_items?.reduce((itemSum: number, item: any) => 
          itemSum + (item.price * item.quantity), 0) || 0;
        return sum + orderTotal;
      }, 0) : 0;

      // Calculate total orders
      const totalOrders = orders ? orders.length : 0;

      // Get unique active sellers from orders
      const activeSellers = orders ? [...new Set(orders.map((order: any) => order.seller_id))].length : 0;

      // Get seller request stats
      const pendingApprovals = sellerRequests.filter(s => s.approval_status === 'pending').length;
      const approvedSellers = sellerRequests.filter(s => s.approval_status === 'approved').length;

      setQuickStats({
        totalSellers: sellerRequests.length,
        pendingApprovals,
        activeSellers: Math.max(activeSellers, approvedSellers), // Use the higher of the two
        totalOrders,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  useEffect(() => {
    fetchSellerRequests();
  }, []);

  useEffect(() => {
    if (sellerRequests.length > 0) {
      fetchQuickStats();
    }
  }, [sellerRequests]);

  const handleSellerAction = async (sellerId: number, email: string, action: 'approve' | 'reject') => {
    const { error: reqError } = await supabase
      .from('seller_requests')
      .update({ approval_status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', sellerId);

    if (reqError) {
      console.error('Error updating seller request:', reqError);
      toast.error(`Failed to ${action} seller`);
      return;
    } else {
      toast.success(`Seller ${action}d successfully`);
      fetchSellerRequests();
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ role: action === 'approve' ? 'seller' : 'buyer' })
      .eq('mail', email);

    if (userError) {
      console.error('Error updating user role:', userError);
    }

    setShowSellerModal(false);
    setSelectedSeller(null);
  };

  const getapproval_statusColor = (approval_status: string) => {
    switch (approval_status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingRequests = sellerRequests.filter(s => s.approval_status === 'pending');
  const oldRequests = sellerRequests.filter(s => s.approval_status !== 'pending');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
            >Go to home
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Analytics */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl ">
            <div className="flex items-center space-x-3 mb-4">
              <ChartBarIcon className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Platform Analytics</h2>
            </div>
            <p className="text-gray-600 mb-4">View platform performance metrics</p>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Analytics
            </Link>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl ">
            <div className="flex items-center space-x-3 mb-4">
              <CubeIcon className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">Product Control</h2>
            </div>
            <p className="text-gray-600 mb-4">Manage all products and inventory</p>
            <Link
              href="/admin/products"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <CubeIcon className="h-4 w-4 mr-2" />
              Manage Products
            </Link>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl ">
            <div className="flex items-center space-x-3 mb-4">
              <ShoppingCartIcon className="h-6 w-6 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Order Oversight</h2>
            </div>
            <p className="text-gray-600 mb-4">Monitor all platform orders</p>
            <Link
              href="/admin/orders"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <ShoppingCartIcon className="h-4 w-4 mr-2" />
              View Orders
            </Link>
          </div>

          {/* Upload Products */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl ">
            <div className="flex items-center space-x-3 mb-4">
              <PlusIcon className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Upload Products</h2>
            </div>
            <p className="text-gray-600 mb-4">Add new products to the platform</p>
            <Link
              href="/admin/upload-product"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-2xl ">
            <div className="flex items-center space-x-3 mb-4">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Quick Stats</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Sellers:</span>
                <span className="font-semibold text-black">{quickStats.totalSellers}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Pending Approvals:</span>
                <span className="font-semibold text-yellow-600">
                  {quickStats.pendingApprovals}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Active Sellers:</span>
                <span className="font-semibold text-green-600">
                  {quickStats.activeSellers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Orders:</span>
                <span className="font-semibold text-blue-600">
                  {quickStats.totalOrders}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total Revenue:</span>
                <span className="font-semibold text-green-600">
                  ₹{quickStats.totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Seller Requests Section */}
        <div className="mt-8">
          {/* Recent Requests */}
          <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Recent Seller Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sellerRequests.filter(request => request.approval_status === 'pending').slice(0, 3).map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.full_name}</div>
                          <div className="text-sm text-gray-500">{request.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{request.phone_number || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.approval_status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : request.approval_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.approval_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{request.productsCount || 0} products</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSeller(request);
                              setShowSellerModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSellerAction(request.id, request.email, 'approve')}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSellerAction(request.id, request.email, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Old Requests */}
          <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Old Seller Requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sellerRequests.filter(request => request.approval_status !== 'pending').slice(0, 6).map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.full_name}</div>
                          <div className="text-sm text-gray-500">{request.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{request.phone_number || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.approval_status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : request.approval_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.approval_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{request.productsCount || 0} products</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedSeller(request);
                            setShowSellerModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Details Modal */}
      {showSellerModal && selectedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg text-black font-sans font-bold">
                Seller Details - {selectedSeller.full_name}
              </h3>
              <button
                onClick={() => {
                  setShowSellerModal(false);
                  setSelectedSeller(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedSeller.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedSeller.phone_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store Name</label>
                  <p className="text-sm text-gray-900">{selectedSeller.store_name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">{selectedSeller.address || '—'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Instagram</label>
                <p className="text-sm text-gray-900">{selectedSeller.instagram_link || '—'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <p className="text-sm text-gray-900">{selectedSeller.whatsapp_number || '—'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Approval Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getapproval_statusColor(selectedSeller.approval_status)}`}>
                  {selectedSeller.approval_status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
