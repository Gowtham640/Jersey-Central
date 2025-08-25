'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { ArrowLeftIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from "../../supabase-client";
import toast from "react-hot-toast";

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
  quantity: number; 
  image_url: any;
}
type StockItem = {
  size: string;
  quantity: number;
  id?:number;
};

export default function Listings() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [editData, setEditData] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const openEditModal = (product: Product) => {
    // ensure we clone object so edits don't mutate original state directly
    setEditData(JSON.parse(JSON.stringify(product)));
    setShowEditModal(true);
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editData) return;
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: name === 'price' ? Number(value) : value,
    });
  };

  // No export — as you asked
  async function updateStock(
    jerseyId: string,
    sizeOrArray: string | { size: string; stock: number }[],
    stockValue?: number
  ) {
    // Case 1: Array of stock objects
    if (Array.isArray(sizeOrArray)) {
      const results = [];
      for (const item of sizeOrArray) {
        const { size, stock } = item;
        const { data, error } = await supabase
          .from('jersey_stock')
          .update({ stock })
          .eq('jersey_id', jerseyId)
          .eq('size', size)
          .select();

        if (error) throw error;
        results.push(data);
      }
      return results;
    }

    // Case 2: Single size-stock update
    const { data, error } = await supabase
      .from('jersey_stock')
      .update({ stock: stockValue })
      .eq('product_id', jerseyId)
      .eq('size', sizeOrArray)
      .select();

    if (error) throw error;
    return data;
  }

  const getFirstImageUrl = (imageUrl: any): string => {
    if (!imageUrl) return '';
    try {
      const parsed = typeof imageUrl === 'string' ? JSON.parse(imageUrl) : imageUrl;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      return typeof imageUrl === 'string' ? imageUrl : '';
    } catch {
      return typeof imageUrl === 'string' ? imageUrl : '';
    }
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editData) return;
  
    const { id, jersey_stock, ...updates } = editData as any;
  
    // 1️⃣ Update jersey details
    const { error: jerseyError } = await supabase
      .from("jerseys")
      .update(updates)
      .eq("id", id);
  
    if (jerseyError) {
      console.error("Error updating product:", jerseyError);
      toast.error("Failed to update product");
      return;
    }
  
    // 🔍 Get current stock from DB for comparison
    const { data: currentStock, error: stockFetchError } = await supabase
      .from("jersey_stock")
      .select("id, size, stock")
      .eq("jersey_id", id);
  
    if (stockFetchError) {
      console.error("Error fetching current stock:", stockFetchError);
      toast.error("Failed to fetch current stock");
      return;
    }
  
    // 2️⃣ Separate update vs insert based on size existence
    const toUpdate: { id: number; size: string; stock: number }[] = [];
    const toInsert: { jersey_id: string; size: string; stock: number }[] = [];
  
    jersey_stock?.forEach((stk: { size: string; stock: number }) => {
      const existing = currentStock?.find(
        (cs) => cs.size.toLowerCase() === stk.size.toLowerCase()
      );
  
      if (existing) {
        // If size exists, prepare update
        toUpdate.push({
          id: existing.id,
          size: stk.size,
          stock: stk.stock,
        });
      } else {
        // If size doesn't exist, prepare insert
        toInsert.push({
          jersey_id: id,
          size: stk.size,
          stock: stk.stock,
        });
      }
    });
  
    // 3️⃣ Update existing stock
    if (toUpdate.length > 0) {
      try {
        await Promise.all(
          toUpdate.map((stk) =>
            supabase
              .from("jersey_stock")
              .update({
                size: stk.size,
                stock: stk.stock,
              })
              .eq("id", stk.id)
          )
        );
      } catch (err) {
        console.error("Stock update failed", err);
        toast.error("Product updated (some stock updates failed)");
      }
    }
  
    // 4️⃣ Insert new stock rows
    if (toInsert.length > 0) {
      try {
        await supabase.from("jersey_stock").insert(toInsert);
      } catch (err) {
        console.error("Stock insert failed", err);
        toast.error("Product updated (some new stock insert failed)");
      }
    }
  
    // 5️⃣ Update local state
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, jersey_stock: jersey_stock } : p
      )
    );
  
    setShowEditModal(false);
    toast.success("Product updated successfully");
  };
  
  
  
  

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('jerseys')
      .select('*,jersey_stock(size,stock)')
      .eq('seller_id', user.id);

    if (error) {
      console.error('Error fetching your products', error.message);
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading listings...</p>
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
            <Link href="/seller" className="mr-4">
              <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Manage Listings</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-600 mb-6">Start by adding your first product</p>
            <Link
              href="/seller/add-product"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border-0 p-6">
                <div className="aspect-w-1 aspect-h-1 w-full mb-4">
                  <img
                    src={getFirstImageUrl(product.image_url)}
                    alt={product.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{product.title}</h3>
                  <p className="text-sm text-gray-600">{product.club}</p>
                  <p className="text-sm text-gray-600">Quality: {product.quality}</p>
                  <p className="text-lg font-bold text-green-600">₹{product.price}</p>
                  
                  <div className="text-sm text-gray-600">
                    <p>Available Sizes:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.jersey_stock
                        .filter(stock => stock.stock > 0)
                        .map(stock => (
                          <span key={stock.size} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {stock.size} ({stock.stock})
                          </span>
                        ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <PencilIcon className="h-4 w-4 inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowDeleteModal(true);
                      }}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <TrashIcon className="h-4 w-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Product</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={editData.title}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
                  <input
                    type="text"
                    name="club"
                    value={editData.club}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={editData.price}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                  <select
                    name="quality"
                    value={editData.quality}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="Fan Version">Fan Version</option>
                    <option value="First Copy">First Copy</option>
                    <option value="Replica">Replica</option>
                    <option value="Original">Original</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Management</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {editData.jersey_stock.map((stock, index) => (
                    <div key={stock.size} className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs text-gray-600 mb-1">Size {stock.size}</label>
                      <input
                        type="number"
                        value={stock.stock}
                        onChange={(e) => {
                          const newStock = [...editData.jersey_stock];
                          newStock[index].stock = parseInt(e.target.value) || 0;
                          setEditData({ ...editData, jersey_stock: newStock });
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{selectedProduct.title}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProduct(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedProduct.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
