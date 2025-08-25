'use client';

import { useState } from 'react';
import { ArrowLeftIcon, EyeIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Mock data - replace with actual data from your backend
const mockProducts = [
  {
    id: 1,
    title: 'Manchester United Home Jersey 2023/24',
    club: 'Manchester United',
    price: 1500,
    quality: 'Fan Version',
    sizes: {
      S: { stock: 10, available: true },
      M: { stock: 25, available: true },
      L: { stock: 15, available: true },
      XL: { stock: 8, available: true }
    },
    totalStock: 58,
    status: 'Active'
  },
  {
    id: 2,
    title: 'Barcelona Away Jersey 2023/24',
    club: 'Barcelona',
    price: 1800,
    quality: 'First Copy',
    sizes: {
      S: { stock: 5, available: true },
      M: { stock: 12, available: true },
      L: { stock: 0, available: false },
      XL: { stock: 3, available: true }
    },
    totalStock: 20,
    status: 'Active'
  },
  {
    id: 3,
    title: 'Real Madrid Home Jersey 2023/24',
    club: 'Real Madrid',
    price: 1600,
    quality: 'Fan Version',
    sizes: {
      S: { stock: 0, available: false },
      M: { stock: 0, available: false },
      L: { stock: 0, available: false },
      XL: { stock: 0, available: false }
    },
    totalStock: 0,
    status: 'Out of Stock'
  }
];

export default function StockManagement() {
  const [products, setProducts] = useState(mockProducts);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingSizes, setEditingSizes] = useState<{[key: string]: {stock: number, available: boolean}}>({});

  const startEditing = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(productId);
      setEditingSizes({...product.sizes});
    }
  };

  const saveChanges = (productId: number) => {
    setProducts(products.map(p => 
      p.id === productId 
        ? { 
            ...p, 
            sizes: editingSizes,
            totalStock: Object.values(editingSizes).reduce((sum, size) => sum + size.stock, 0),
            status: Object.values(editingSizes).some(size => size.stock > 0) ? 'Active' : 'Out of Stock'
          }
        : p
    ));
    setEditingProduct(null);
    setEditingSizes({});
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditingSizes({});
  };

  const updateSizeStock = (size: string, stock: number) => {
    setEditingSizes(prev => ({
      ...prev,
      [size]: { ...prev[size], stock: Math.max(0, stock) }
    }));
  };

  const toggleSizeAvailability = (size: string, available: boolean) => {
    setEditingSizes(prev => ({
      ...prev,
      [size]: { 
        ...prev[size], 
        available: available,
        stock: available ? 0 : prev[size].stock
      }
    }));
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'text-red-600';
    if (stock <= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/seller" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Stock Management</h1>
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
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="h-6 w-6 bg-green-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.status === 'Active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="h-6 w-6 bg-red-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.status === 'Out of Stock').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <div className="h-6 w-6 bg-yellow-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.reduce((sum, p) => sum + p.totalStock, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Product Stock Levels</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock by Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Stock
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
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.club}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.quality}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {Object.entries(product.sizes).map(([size, sizeData]) => (
                          <div key={size} className="text-center">
                            <div className="text-xs text-gray-500">{size}</div>
                            <div className={`text-sm font-medium ${
                              sizeData.available ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {sizeData.stock}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.totalStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingProduct === product.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveChanges(product.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(product.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Editing Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Stock Levels</h3>
                <button
                  onClick={cancelEditing}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(editingSizes).map(([size, sizeData]) => (
                    <div key={size} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          checked={sizeData.available}
                          onChange={(e) => toggleSizeAvailability(size, e.target.checked)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label className="text-sm font-medium text-gray-900">Size {size}</label>
                      </div>
                      
                      {sizeData.available && (
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Stock</label>
                          <input
                            type="number"
                            value={sizeData.stock}
                            onChange={(e) => updateSizeStock(size, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveChanges(editingProduct)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 