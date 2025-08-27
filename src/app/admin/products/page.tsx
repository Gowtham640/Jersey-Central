'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftIcon, EyeIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

interface JerseyStock {
  size: string;
  stock: number;
}

interface Product {
  id: string;
  title: string;
  club: string;
  price: number;
  quality: string;
  jersey_stock: JerseyStock[];
  image_url: string | string[];
  seller_id: string;
  created_at: string;
  seller?: {
    full_name: string;
    mail: string;
  };
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClub, setFilterClub] = useState('all');
  const [filterSeller, setFilterSeller] = useState('all');
  const [filterQuality, setFilterQuality] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const getFirstImageUrl = (imageUrl: string | string[]): string => {
    if (!imageUrl) return '';
    try {
      const parsed = typeof imageUrl === 'string' ? JSON.parse(imageUrl) : imageUrl;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      return typeof imageUrl === 'string' ? imageUrl : '';
    } catch {
      return typeof imageUrl === 'string' ? imageUrl : '';
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch all jerseys with stock data and seller information
      const { data: jerseys, error } = await supabase
        .from('jerseys')
        .select(`
          *,
          jersey_stock(size, stock),
          seller:users!jerseys_seller_id_fkey(full_name, mail)
        `);

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to fetch products');
        setProducts([]);
        return;
      }

      // Map products with seller information
      const productsWithSellers = (jerseys || []).map((jersey) => ({
        ...jersey,
        seller: jersey.seller || { full_name: 'Unknown Seller', mail: jersey.seller_id }
      }));

      setProducts(productsWithSellers as Product[]);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      toast.error('Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('jerseys')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
        return;
      }

      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted successfully');
      setShowDeleteModal(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast.error('Failed to delete product');
    }
  };

  const getStatusColor = (product: Product) => {
    const totalStock = product.jersey_stock?.reduce((acc, s) => acc + s.stock, 0) || 0;
    if (totalStock === 0) return 'bg-red-100 text-red-800';
    if (totalStock <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (product: Product) => {
    const totalStock = product.jersey_stock?.reduce((acc, s) => acc + s.stock, 0) || 0;
    if (totalStock === 0) return 'Out of Stock';
    if (totalStock <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.seller?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClub = filterClub === 'all' || product.club === filterClub;
    const matchesSeller = filterSeller === 'all' || product.seller?.full_name === filterSeller;
    const matchesQuality = filterQuality === 'all' || product.quality === filterQuality;
    const matchesStatus = filterStatus === 'all' || getStatusText(product) === filterStatus;

    return matchesSearch && matchesClub && matchesSeller && matchesQuality && matchesStatus;
  });

  const uniqueClubs = [...new Set(products.map(p => p.club))];
  const uniqueSellers = [...new Set(products.map(p => p.seller?.full_name).filter(Boolean))];

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
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
                <ArrowLeftIcon className="h-6 w-6 text-white hover:text-white" />
              </Link>
              <h1 className="text-xl md:text-2xl font-bold font-sans text-white">Product Control</h1>
            </div>
            <Link
              href="/admin/upload-product"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
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
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="h-6 w-6 bg-green-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => getStatusText(p) === 'In Stock').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="h-6 w-6 bg-red-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {products.filter(p => getStatusText(p) === 'Out of Stock').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <div className="h-6 w-6 bg-purple-600 rounded"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unique Sellers</p>
                <p className="text-2xl font-semibold text-gray-900">{uniqueSellers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border-0 p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 text-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="all">All Clubs</option>
                {uniqueClubs.map(club => (
                  <option key={club} value={club}>{club}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seller</label>
              <select
                value={filterSeller}
                onChange={(e) => setFilterSeller(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="all">All Sellers</option>
                {uniqueSellers.map(seller => (
                  <option key={seller} value={seller}>{seller}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
              <select
                value={filterQuality}
                onChange={(e) => setFilterQuality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
              >
                <option value="all">All Qualities</option>
                <option value="Fan Version">Fan Version</option>
                <option value="First Copy">First Copy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 text-gray-900 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-sm border-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">All Products ({filteredProducts.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                            <img src={getFirstImageUrl(product.image_url)} className="h-10 w-10 rounded-lg object-cover" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.title}</div>
                          <div className="text-sm text-gray-500">{product.club}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.seller?.full_name || 'Unknown Seller'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full`}>
                        {product.quality}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.jersey_stock && product.jersey_stock.length > 0 ? (
                        <ul>
                          {product.jersey_stock.map(({ size, stock }) => (
                            <li key={size}>
                              {size}: {stock}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-500">No stock info</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product)}`}>
                        {getStatusText(product)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowViewModal(true);
                          }}
                          className="text-green-600 hover:text-green-700"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete &quot;{selectedProduct.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDelete(selectedProduct.id)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <img src={getFirstImageUrl(selectedProduct.image_url)} alt={selectedProduct.title} className="w-full h-48 object-cover rounded" />
              </div>
              <div className="space-y-2 text-gray-900">
                <p><span className="font-semibold">Title:</span> {selectedProduct.title}</p>
                <p><span className="font-semibold">Club:</span> {selectedProduct.club}</p>
                <p><span className="font-semibold">Quality:</span> {selectedProduct.quality}</p>
                <p><span className="font-semibold">Price:</span> ₹{selectedProduct.price}</p>
                <div>
                  <p className="font-semibold">Stock:</p>
                  {selectedProduct.jersey_stock?.length ? (
                    <ul className="list-disc ml-5">
                      {selectedProduct.jersey_stock.map(s => (
                        <li key={s.size}>{s.size}: {s.stock}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No stock info</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 