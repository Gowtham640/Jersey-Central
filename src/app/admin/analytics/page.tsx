'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftIcon, ArrowTrendingUpIcon, CurrencyRupeeIcon, ShoppingBagIcon, UsersIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '../../supabase-client';

interface Jersey {
  id: string;
  title: string;
  price: number;
  image_url: string | string[];
  club: string;
  season: string;
  seller_id: string;
  created_at: string;
  jersey_stock: Array<{
    size: string;
    stock: number;
  }>;
  seller?: {
    full_name: string;
  };
}

interface OrderItem {
  id: string;
  jersey_id: string;
  price: number;
  quantity: number;
  product_title?: string;
}

interface Order {
  id: string;
  created_at: string;
  order_items: OrderItem[];
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
  seller: string;
}

interface TopSeller {
  name: string;
  sales: number;
  orders: number;
  products: number;
}

interface SellerPerformance {
  seller: string;
  growth: number;
  orders: number;
  revenue: number;
}

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  totalSellers: number;
  activeSellers: number;
  thisWeekSales: number;
  thisMonthSales: number;
  weeklyData: Array<{ week: string; sales: number }>;
  monthlyData: Array<{ month: string; sales: number }>;
  topProducts: TopProduct[];
  topSellers: TopSeller[];
  sellerPerformance: SellerPerformance[];
}

export default function AdminAnalytics() {
  const [timeFrame, setTimeFrame] = useState('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all jerseys with stock data
      const { data: jerseys, error: jerseysError } = await supabase
        .from('jerseys')
        .select(`
          *,
          jersey_stock(size, stock)
        `);

      if (jerseysError) {
        console.error('Error fetching jerseys:', jerseysError);
        return;
      }

      // Map jerseys with seller information
      const jerseysWithSellers = (jerseys || []).map((jersey) => ({
        ...jersey,
        seller: { 
          full_name: 'Seller' // Placeholder since we can't directly join with auth.users
        }
      }));

      // Handle case where jerseys is null or empty
      if (!jerseysWithSellers || jerseysWithSellers.length === 0) {
        setAnalytics({
          totalSales: 0,
          totalOrders: 0,
          totalSellers: 0,
          activeSellers: 0,
          thisWeekSales: 0,
          thisMonthSales: 0,
          weeklyData: [],
          monthlyData: [],
          topProducts: [],
          topSellers: [],
          sellerPerformance: []
        });
        return;
      }

      // Fetch real orders data
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      }
      
      // Calculate analytics from real data
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate total sales from orders
      const totalSales = orders ? orders.reduce((sum: number, order: Order) => {
        const orderTotal = order.order_items?.reduce((itemSum: number, item: OrderItem) => 
          itemSum + (item.price * item.quantity), 0) || 0;
        return sum + orderTotal;
      }, 0) : 0;

      // Calculate total orders
      const totalOrders = orders ? orders.length : 0;

      // Calculate this week's sales from orders
      const thisWeekSales = orders ? orders
        .filter((order: Order) => new Date(order.created_at) >= weekAgo)
        .reduce((sum: number, order: Order) => {
          const orderTotal = order.order_items?.reduce((itemSum: number, item: OrderItem) => 
            itemSum + (item.price * item.quantity), 0) || 0;
          return sum + orderTotal;
        }, 0) : 0;

      // Calculate this month's sales from orders
      const thisMonthSales = orders ? orders
        .filter((order: Order) => new Date(order.created_at) >= monthAgo)
        .reduce((sum: number, order: Order) => {
          const orderTotal = order.order_items?.reduce((itemSum: number, item: OrderItem) => 
            itemSum + (item.price * item.quantity), 0) || 0;
          return sum + orderTotal;
        }, 0) : 0;

      // Get unique sellers from jerseys
      const uniqueSellerIds = [...new Set(jerseysWithSellers.map((jersey: Jersey) => jersey.seller_id))];
      const totalSellers = uniqueSellerIds.length;

      // Calculate active sellers (sellers with products created in last 30 days)
      const activeSellers = [...new Set(
        jerseysWithSellers
          .filter((jersey: Jersey) => new Date(jersey.created_at) >= monthAgo)
          .map((jersey: Jersey) => jersey.seller_id)
      )].length;

      // Generate weekly data for the last 4 weeks from orders
      const weeklyData = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const weekSales = orders ? orders
          .filter((order: Order) => {
            const created = new Date(order.created_at);
            return created >= weekStart && created < weekEnd;
          })
          .reduce((sum: number, order: Order) => {
            const orderTotal = order.order_items?.reduce((itemSum: number, item: OrderItem) => 
              itemSum + (item.price * item.quantity), 0) || 0;
            return sum + orderTotal;
          }, 0) : 0;

        weeklyData.push({
          week: `Week ${4 - i}`,
          sales: weekSales
        });
      }

      // Generate monthly data for the last 6 months from orders
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), monthStart.getMonth() + 1, 0);
        
        const monthSales = orders ? orders
          .filter((order: Order) => {
            const created = new Date(order.created_at);
            return created >= monthStart && created <= monthEnd;
          })
          .reduce((sum: number, order: Order) => {
            const orderTotal = order.order_items?.reduce((itemSum: number, item: OrderItem) => 
              itemSum + (item.price * item.quantity), 0) || 0;
            return sum + orderTotal;
          }, 0) : 0;

        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          sales: monthSales
        });
      }

      // Calculate top products by revenue from orders
      const topProducts = orders ? orders
        .flatMap((order: Order) => order.order_items || [])
        .reduce((acc: TopProduct[], item: OrderItem) => {
          // Find the jersey details for this order item
          const jersey = jerseysWithSellers.find((j: Jersey) => j.id === item.jersey_id);
          const productName = jersey ? jersey.title : (item.product_title || 'Unknown Product');
          
          const existing = acc.find(p => p.name === productName);
          if (existing) {
            existing.sales += item.quantity;
            existing.revenue += item.price * item.quantity;
          } else {
            acc.push({
              name: productName,
              sales: item.quantity,
              revenue: item.price * item.quantity,
              seller: jersey?.seller?.full_name || jersey?.seller_id || 'Unknown'
            });
          }
          return acc;
        }, [])
        .sort((a: TopProduct, b: TopProduct) => b.revenue - a.revenue)
        .slice(0, 5) : [];

      // Create a map to store stats for each seller
      const sellerStatsMap: Record<
      string,
      { sales: number; orders: Set<string>; products: number }
      > = {};

      // Loop through each order and calculate stats
      orders?.forEach((order: Order) => {
      order?.order_items?.forEach((item: OrderItem) => {
        const jersey = jerseysWithSellers?.find((j: Jersey) => j.id === item.jersey_id);
        if (!jersey) return; // Skip if jersey not found (safety check)

        const sellerId = jersey.seller_id;

        // Initialize if seller doesn't exist in map
        if (!sellerStatsMap[sellerId]) {
          sellerStatsMap[sellerId] = { sales: 0, orders: new Set(), products: 0 };
        }

        // Add sales (fallback to 0 if fields are missing)
        sellerStatsMap[sellerId].sales += (item.price || 0) * (item.quantity || 0);

        // Track unique orders
        sellerStatsMap[sellerId].orders.add(order.id);
      });
      });

      // Convert the stats map into an array and sort by sales
      const sellerStats = Object.entries(sellerStatsMap)
      .map(([sellerId, data]) => {
        const jersey = jerseysWithSellers?.find((j: Jersey) => j.seller_id === sellerId);
        return {
          name: jersey?.seller?.full_name || sellerId,
          sales: data.sales,
          orders: data.orders.size,
          products: jerseysWithSellers?.filter((j: Jersey) => j.seller_id === sellerId)?.length || 0,
        };
      })
      .sort((a, b) => b.sales - a.sales);


      // Calculate seller performance
      const sellerPerformance = sellerStats.map((seller: TopSeller) => ({
        seller: seller.name,
        growth: Math.floor(Math.random() * 30) + 5, // Mock growth for now
        orders: seller.orders,
        revenue: seller.sales
      }));

      setAnalytics({
        totalSales,
        totalOrders,
        totalSellers,
        activeSellers,
        thisWeekSales,
        thisMonthSales,
        weeklyData,
        monthlyData,
        topProducts,
        topSellers: sellerStats,
        sellerPerformance
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        totalSales: 0,
        totalOrders: 0,
        totalSellers: 0,
        activeSellers: 0,
        thisWeekSales: 0,
        thisMonthSales: 0,
        weeklyData: [],
        monthlyData: [],
        topProducts: [],
        topSellers: [],
        sellerPerformance: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeFrame]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 gap-4">
            <div className="flex items-center">
              <Link href="/admin" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
              </Link>
              <h1 className="text-xl md:text-2xl font-bold text-white">Platform Analytics</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:space-x-4">
              <button
                onClick={() => fetchAnalytics()}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 text-sm"
              >
                Refresh Data
              </button>
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                className="px-3 py-2 border text-white border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
              >
                <option value="week" className='text-gray-900'>This Week</option>
                <option value="month"className='text-gray-900'>This Month</option>
                <option value="quarter"className='text-gray-900'>This Quarter</option>
                <option value="year"className='text-gray-900'>This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Time Frame Selector */}
        <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Analytics Overview</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Frame:</label>
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyRupeeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(analytics.totalSales)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sellers</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.totalSellers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sellers</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.activeSellers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h2>
            <div className="space-y-4">
              {analytics.monthlyData.map((data, index) => (
                                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm text-gray-600">{data.month}</span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2">
                    <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.max((data.sales / Math.max(...analytics.monthlyData.map(m => m.sales))) * 100, 5)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(data.sales)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seller Performance */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seller Performance</h2>
            <div className="space-y-4">
              {analytics.sellerPerformance.map((seller, index) => (
                                  <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm text-gray-600">{seller.seller}</span>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-2">
                    <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${Math.max((seller.revenue / Math.max(...analytics.sellerPerformance.map(s => s.revenue))) * 100, 5)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(seller.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden mb-8">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Top Performing Sellers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Sales
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {analytics.topSellers.map((seller, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{seller.name}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(seller.sales)}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seller.orders} orders
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {seller.products} products
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-20 sm:w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.max((seller.sales / Math.max(...analytics.topSellers.map(s => s.sales))) * 100, 5)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round((seller.sales / Math.max(...analytics.topSellers.map(s => s.sales))) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Top Selling Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units Sold
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {analytics.topProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.seller}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.sales} units
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-20 sm:w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.max((product.revenue / Math.max(...analytics.topProducts.map(p => p.revenue))) * 100, 5)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round((product.revenue / Math.max(...analytics.topProducts.map(p => p.revenue))) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 