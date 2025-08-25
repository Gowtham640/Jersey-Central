'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('month');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
    
        // 1) Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('User not authenticated');
          setLoading(false);
          return;
        }
    
        // 2) Jerseys (names only; no stock math here)
        const { data: jerseys, error: jerseysError } = await supabase
          .from('jerseys')
          .select('id, title')
          .eq('seller_id', user.id);
    
        if (jerseysError) {
          console.error('Error fetching jerseys:', jerseysError);
          toast.error('Failed to fetch jerseys');
          setLoading(false);
          return;
        }
    
        // Map for product names
        const jerseyNameById = new Map<string, string>(
          (jerseys || []).map((j: any) => [j.id, j.title])
        );
    
        // 3) Orders (ONLY items that belong to this seller)
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            status,
            order_items!inner(
              id,
              jersey_id,
              price,
              quantity,
              size,
              jerseys!inner(seller_id)
            )
          `)
          .eq('order_items.jerseys.seller_id', user.id);
          // Optional: restrict to paid/completed
          // .in('status', ['paid', 'completed']);
    
        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
        }
    
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
        const toNum = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
    
        // --------- If we have orders, compute from orders only ----------
        if (orders && orders.length > 0) {
          const productStats: Record<string, { name: string; sales: number; revenue: number }> = {};
          const orderTotals: Record<string, number> = {};
    
          let totalSales = 0;
          let totalOrders = 0;
          let thisWeekSales = 0;
          let thisMonthSales = 0;
    
          (orders as any[]).forEach((order) => {
            totalOrders += 1;
            let orderTotal = 0;
    
            (order.order_items || []).forEach((item: any) => {
              const qty = Math.floor(toNum(item.quantity));
              const price = toNum(item.price);
              if (qty <= 0 || price <= 0) return;
    
              const itemTotal = qty * price;
              orderTotal += itemTotal;
    
              const jid = item.jersey_id;
              const name = jerseyNameById.get(jid) || `Product ${jid}`;
              if (!productStats[jid]) productStats[jid] = { name, sales: 0, revenue: 0 };
              productStats[jid].sales += qty;
              productStats[jid].revenue += itemTotal;
            });
    
            orderTotals[order.id] = orderTotal;
            totalSales += orderTotal;
    
            const created = new Date(order.created_at);
            if (created >= weekAgo) thisWeekSales += orderTotal;
            if (created >= monthAgo) thisMonthSales += orderTotal;
          });
    
          // Weekly buckets (last 4 weeks)
          const weeklyData: Array<{ week: string; sales: number }> = [];
          for (let i = 3; i >= 0; i--) {
            const start = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            let weekSales = 0;
            (orders as any[]).forEach((order) => {
              const created = new Date(order.created_at);
              if (created >= start && created < end) weekSales += orderTotals[order.id] || 0;
            });
            weeklyData.push({ week: `Week ${4 - i}`, sales: weekSales });
          }
    
          // Monthly buckets (last 6 months)
          const monthlyData: Array<{ month: string; sales: number }> = [];
          for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), monthStart.getMonth() + 1, 0);
            let monthSales = 0;
            (orders as any[]).forEach((order) => {
              const created = new Date(order.created_at);
              if (created >= monthStart && created <= monthEnd) monthSales += orderTotals[order.id] || 0;
            });
            monthlyData.push({
              month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              sales: monthSales,
            });
          }
    
          const topProducts = Object.entries(productStats)
            .map(([jid, s]) => ({ jerseyId: jid, name: s.name, sales: s.sales, revenue: s.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    
          setAnalytics({
            totalSales,
            totalOrders,
            thisWeekSales,
            thisMonthSales,
            weeklyData,
            monthlyData,
            topProducts,
          });
        } else {
          // --------- No orders: show zeros (do NOT use stock or price) ----------
          const weeklyData = Array.from({ length: 4 }, (_, i) => ({
            week: `Week ${i + 1}`,
            sales: 0,
          }));
    
          const monthlyData = Array.from({ length: 6 }, (_, i) => {
            const idx = 5 - i;
            const monthStart = new Date(now.getFullYear(), now.getMonth() - idx, 1);
            return {
              month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              sales: 0,
            };
          });
    
          const topProducts = (jerseys || [])
            .map((j: any) => ({ jerseyId: j.id, name: j.title, sales: 0, revenue: 0 }))
            .slice(0, 5);
    
          setAnalytics({
            totalSales: 0,
            totalOrders: 0,
            thisWeekSales: 0,
            thisMonthSales: 0,
            weeklyData,
            monthlyData,
            topProducts,
          });
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to fetch analytics');
        setAnalytics({
          totalSales: 0,
          totalOrders: 0,
          thisWeekSales: 0,
          thisMonthSales: 0,
          weeklyData: [],
          monthlyData: [],
          topProducts: [],
        });
      } finally {
        setLoading(false);
      }
    };
    
    

  useEffect(() => {
    fetchAnalytics();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) fetchAnalytics();
      else if (event === 'SIGNED_OUT')
        setAnalytics({
          totalSales: 0,
          totalOrders: 0,
          thisWeekSales: 0,
          thisMonthSales: 0,
          weeklyData: [],
          monthlyData: [],
          topProducts: [],
        });
    });
    return () => subscription.unsubscribe();
  }, [timeRange]);

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

  const maxWeekly = Math.max(...analytics.weeklyData.map((w: any) => w.sales), 1);
  const maxMonthly = Math.max(...analytics.monthlyData.map((m: any) => m.sales), 1);
  const maxRevenue = Math.max(...analytics.topProducts.map((p: any) => p.revenue), 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/seller" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
              </Link>
              <h1 className="text-2xl font-sans font-bold text-white">
                Analytics Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchAnalytics}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500"
              >
                Refresh Data
              </button>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 text-gray-900 bg-white focus:ring-green-500 focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>
      </div>
  
      {/* Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Sales */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6 flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(analytics.totalSales)}
              </p>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6 flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.totalOrders}
              </p>
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6 flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(analytics.thisWeekSales)}
              </p>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6 flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(analytics.thisMonthSales)}
              </p>
            </div>
          </div>
        </div>

        {/* Weekly & Monthly Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Trend */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Trend
            </h2>
            <div className="space-y-4">
              {analytics.weeklyData.map((data: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{data.week}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${Math.max(
                            (data.sales / maxWeekly) * 100,
                            5
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.sales)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Performance
            </h2>
            <div className="space-y-4">
              {analytics.monthlyData.map((data: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{data.month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-600"
                        style={{
                          width: `${Math.max(
                            (data.sales / maxMonthly) * 100,
                            5
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(data.sales)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Selling Products
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Units Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {analytics.topProducts.map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.sales} units
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(p.revenue)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${Math.max(
                                (p.revenue / maxRevenue) * 100,
                                5
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">
                          {Math.round((p.revenue / maxRevenue) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights & Recommendations */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Insights */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Key Insights
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  {analytics.thisMonthSales > 0
                    ? `Sales this month: ${formatCurrency(
                        analytics.thisMonthSales
                      )}`
                    : "No sales recorded this month yet"}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  {analytics.topProducts.length > 0
                    ? `${analytics.topProducts[0].name} is your best performer`
                    : "No products available yet"}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  Total revenue: {formatCurrency(analytics.totalSales)}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  Total orders placed: {analytics.totalOrders}
                </span>
              </li>
            </ul>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recommendations
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  {analytics.totalOrders === 0
                    ? "Start adding products to your inventory"
                    : "Consider expanding your product variety"}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  {analytics.thisWeekSales === 0
                    ? "Focus on promoting your products this week"
                    : "Maintain momentum by engaging with your top customers"}
                </span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3"></div>
                <span className="text-sm text-gray-700">
                  {analytics.totalSales < 1000
                    ? "Offer discounts or bundle deals to increase revenue"
                    : "Analyze trends and optimize high-performing products"}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}  