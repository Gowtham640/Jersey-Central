'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

// --- Type definitions ---
interface JerseyMeta {
  seller_id: string;
  title: string | null;
  image_url: string | null; // may be single URL or JSON array string
}

interface OrderItem {
  id: string;
  jersey_id: string;
  size: string;
  quantity: number;
  price: number;
  jersey?: JerseyMeta;
}

interface Order {
  id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  order_items: OrderItem[];
}

// Supabase raw response for mapping
interface SupabaseOrderResponse {
  id: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  order_items: {
    id: string;
    jersey_id: string;
    size: string;
    price: number;
    quantity: number;
    jerseys: {
      id: string;
      seller_id: string;
      title: string | null;
      image_url: string | null;
    };
  }[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tempStatus, setTempStatus] = useState<string | null>(null);

  // Helper: parse image_url (single string or JSON array string) and return first URL
  const firstImage = (image_url?: string | null): string => {
    if (!image_url) return '';
    try {
      const parsed = JSON.parse(image_url);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed[0] || '');
      }
    } catch {
      // not JSON, treat as single URL
    }
    return image_url;
  };

  const fetchOrders = async (): Promise<void> => {
    try {
      setLoading(true);

      // Get current user (seller)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('User not authenticated');
        setOrders([]);
        return;
      }

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          created_at,
          status,
          order_items!inner(
            id,
            jersey_id,
            size,
            price,
            quantity,
            jerseys!inner(
              id,
              seller_id,
              title,
              image_url
            )
          )
        `)
        .eq('order_items.jerseys.seller_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        toast.error('Failed to fetch orders');
        setOrders([]);
        return;
      }

      const transformed: Order[] = (ordersData ?? []).map((o) => {
        const order = o as SupabaseOrderResponse;
        return {
          id: order.id,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          order_items: order.order_items.map((it) => ({
            id: it.id,
            jersey_id: it.jersey_id,
            size: it.size,
            price: it.price,
            quantity: it.quantity,
            jersey: {
              seller_id: it.jerseys.seller_id,
              title: it.jerseys.title,
              image_url: it.jerseys.image_url,
            },
          })),
        };
      });

      setOrders(transformed);
    } catch {
      toast.error('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const restoreStockForOrderItems = async (order: Order): Promise<void> => {
    const itemErrors: string[] = [];

    for (const item of order.order_items) {
      const { data: stockRow, error: fetchErr } = await supabase
        .from('jersey_stock')
        .select('id, stock')
        .eq('jersey_id', item.jersey_id)
        .eq('size', item.size)
        .maybeSingle<{ id: string; stock: number }>();

      if (fetchErr) {
        itemErrors.push(`fetch stock failed (size ${item.size})`);
        continue;
      }

      if (stockRow) {
        const newStock = Number(stockRow.stock ?? 0) + Number(item.quantity);
        const { error: updErr } = await supabase
          .from('jersey_stock')
          .update({ stock: newStock })
          .eq('id', stockRow.id);

        if (updErr) itemErrors.push(`update failed (size ${item.size})`);
      } else {
        const { error: insErr } = await supabase
          .from('jersey_stock')
          .insert({
            jersey_id: item.jersey_id,
            size: item.size,
            stock: item.quantity,
          });

        if (insErr) itemErrors.push(`insert failed (size ${item.size})`);
      }
    }

    if (itemErrors.length) {
      throw new Error(itemErrors.join(', '));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string): Promise<void> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      toast.error('Order not found');
      return;
    }

    const oldStatus = order.status;

    try {
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        await restoreStockForOrderItems(order);
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (updateError) {
        throw updateError;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o))
      );

      toast.success('Order status updated successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update order status';
      toast.error(msg);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter((o) => o.status === filterStatus);

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/seller" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Orders Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="h-6 w-6 bg-blue-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <div className="h-6 w-6 bg-yellow-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter((o) => o.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="h-6 w-6 bg-blue-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter((o) => o.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="h-6 w-6 bg-green-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {orders.filter((o) => o.status === 'delivered').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border-0 p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Orders ({filteredOrders.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                        <div className="text-gray-500">₹{order.total_amount}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{order.order_items.length} items</div>
                        <div className="text-gray-500">
                          {order.order_items.map((item, idx) => (
                            <span key={item.id}>
                              {item.size} x{item.quantity}
                              {idx < order.order_items.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{order.total_amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setTempStatus(order.status);
                          setShowOrderModal(true);
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Details - {selectedOrder.id}</h3>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                  setTempStatus(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Order ID:</span> {selectedOrder.id}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Total Amount:</span> ₹{selectedOrder.total_amount}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Status:</span> {selectedOrder.status}
                    </p>
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Date:</span>{' '}
                      {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.order_items.map((item) => {
                      const img = firstImage(item.jersey?.image_url || '');
                      return (
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
                          {img ? (
                            <img src={img} alt={item.jersey?.title || 'Jersey'} className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-200" />
                          )}
                          <div className="text-sm font-medium text-gray-900">
                            {item.jersey?.title || 'Jersey'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Order Status (editable, saved explicitly) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Status</label>
                <select
                  value={tempStatus || selectedOrder.status}
                  onChange={(e) => setTempStatus(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={async () => {
                  const newStatus = tempStatus || selectedOrder.status;
                  if (newStatus !== selectedOrder.status) {
                    await updateOrderStatus(selectedOrder.id, newStatus);
                  }
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                  setTempStatus(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowOrderModal(false);
                  setSelectedOrder(null);
                  setTempStatus(null);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
