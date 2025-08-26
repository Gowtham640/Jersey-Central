'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  TrashIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { supabase } from '../../supabase-client';
import toast from 'react-hot-toast';

interface HomepageSection {
  id: string;
  title: string;
  type: 'top-picks' | 'best-deals' | 'new-arrivals' | 'trending' | 'custom';
  visible: boolean;
  order_index: number;
  products: HomepageProduct[];
  created_at: string;
}

interface HomepageProduct {
  id: string;
  jersey_id: string;
  section_id: string;
  order_index: number;
  jersey?: {
    id: string;
    title: string;
    price: number;
    image_url: string;
    club: string;
    quality: string;
  };
}

interface Jersey {
  id: string;
  title: string;
  price: number;
  image_url: string;
  club: string;
  quality: string;
  seller_id: string;
}

interface HomepageProductData {
  id: string;
  jersey_id: string;
  section_id: string;
  order_index: number;
  jersey: {
    id: string;
    title: string;
    price: number;
    image_url: string;
    club: string;
    quality: string;
  };
}

export default function HomepageEditor() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [availableJerseys, setAvailableJerseys] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedSection, setSelectedSection] = useState<HomepageSection | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionType, setNewSectionType] = useState<'top-picks' | 'best-deals' | 'new-arrivals' | 'trending' | 'custom'>('custom');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch homepage sections and products
  const fetchHomepageData = async () => {
    try {
      setLoading(true);
      
      // Fetch sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('homepage_sections')
        .select(`
          *,
          homepage_products(
            *,
            jersey:jerseys(id, title, price, image_url, club, quality)
          )
        `)
        .order('order_index');

      if (sectionsError) {
        console.error('Error fetching sections:', sectionsError);
        toast.error('Failed to fetch homepage sections');
        return;
      }

      // Transform the data to match our interface
      const transformedSections = (sectionsData || []).map(section => ({
        ...section,
        products: (section.homepage_products || []).map((product: HomepageProductData) => ({
          ...product,
          jersey: product.jersey
        })).sort((a: HomepageProductData, b: HomepageProductData) => a.order_index - b.order_index)
      }));

      setSections(transformedSections);

      // Fetch available jerseys for adding to sections
      const { data: jerseysData, error: jerseysError } = await supabase
        .from('jerseys')
        .select('id, title, price, image_url, club, quality, seller_id')
        .order('created_at', { ascending: false });

      if (jerseysError) {
        console.error('Error fetching jerseys:', jerseysError);
        toast.error('Failed to fetch available products');
        return;
      }

      setAvailableJerseys(jerseysData || []);
    } catch (error) {
      console.error('Error in fetchHomepageData:', error);
      toast.error('Failed to fetch homepage data');
    } finally {
      setLoading(false);
    }
  };

  // Create new section
  const createSection = async () => {
    if (!newSectionTitle.trim()) {
      toast.error('Section title is required');
      return;
    }

    try {
      const newOrder = sections.length;
      
      const { data, error } = await supabase
        .from('homepage_sections')
        .insert({
          title: newSectionTitle,
          type: newSectionType,
          visible: true,
          order_index: newOrder
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating section:', error);
        toast.error('Failed to create section');
        return;
      }

      const newSection: HomepageSection = {
        ...data,
        products: []
      };

      setSections(prev => [...prev, newSection]);
      setNewSectionTitle('');
      setNewSectionType('custom');
      setShowAddSection(false);
      toast.success('Section created successfully');
    } catch (error) {
      console.error('Error in createSection:', error);
      toast.error('Failed to create section');
    }
  };

  // Toggle section visibility
  const toggleSectionVisibility = async (sectionId: string) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const { error } = await supabase
        .from('homepage_sections')
        .update({ visible: !section.visible })
        .eq('id', sectionId);

      if (error) {
        console.error('Error updating section visibility:', error);
        toast.error('Failed to update section visibility');
        return;
      }

      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      ));
      toast.success('Section visibility updated');
    } catch (error) {
      console.error('Error in toggleSectionVisibility:', error);
      toast.error('Failed to update section visibility');
    }
  };

  // Delete section
  const deleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? This will also remove all products from it.')) {
      return;
    }

    try {
      // First delete all products in the section
      const { error: productsError } = await supabase
        .from('homepage_products')
        .delete()
        .eq('section_id', sectionId);

      if (productsError) {
        console.error('Error deleting section products:', productsError);
        toast.error('Failed to delete section products');
        return;
      }

      // Then delete the section
      const { error: sectionError } = await supabase
        .from('homepage_sections')
        .delete()
        .eq('id', sectionId);

      if (sectionError) {
        console.error('Error deleting section:', sectionError);
        toast.error('Failed to delete section');
        return;
      }

      setSections(prev => prev.filter(s => s.id !== sectionId));
      toast.success('Section deleted successfully');
    } catch (error) {
      console.error('Error in deleteSection:', error);
      toast.error('Failed to delete section');
    }
  };

  // Add product to section
  const addProductToSection = async (sectionId: string, jerseyId: string) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const newOrder = section.products.length;
      
      const { data, error } = await supabase
        .from('homepage_products')
        .insert({
          section_id: sectionId,
          jersey_id: jerseyId,
          order_index: newOrder
        })
        .select(`
          *,
          jersey:jerseys(id, title, price, image_url, club, quality)
        `)
        .single();

      if (error) {
        console.error('Error adding product to section:', error);
        toast.error('Failed to add product to section');
        return;
      }

      const newProduct: HomepageProduct = {
        ...data,
        jersey: data.jersey
      };

      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, products: [...s.products, newProduct] }
          : s
      ));

      setShowAddProduct(false);
      setSelectedSection(null);
      toast.success('Product added to section');
    } catch (error) {
      console.error('Error in addProductToSection:', error);
      toast.error('Failed to add product to section');
    }
  };

  // Remove product from section
  const removeProductFromSection = async (sectionId: string, productId: string) => {
    try {
      const { error } = await supabase
        .from('homepage_products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error removing product from section:', error);
        toast.error('Failed to remove product from section');
        return;
      }

      setSections(prev => prev.map(s => 
        s.id === sectionId 
          ? { ...s, products: s.products.filter(p => p.id !== productId) }
          : s
      ));

      toast.success('Product removed from section');
    } catch (error) {
      console.error('Error in removeProductFromSection:', error);
      toast.error('Failed to remove product from section');
    }
  };

  useEffect(() => {
    fetchHomepageData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading homepage editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-black shadow-sm border-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link href="/admin" className="mr-4">
                <ArrowLeftIcon className="h-6 w-6 text-white hover:text-gray-300" />
              </Link>
              <h1 className="text-2xl font-bold text-white">Homepage Editor</h1>
            </div>
            <button
              onClick={() => setShowAddSection(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Section
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border-0 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    section.visible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {section.visible ? 'Visible' : 'Hidden'}
                  </span>
                  <span className="text-sm text-gray-500">Type: {section.type}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleSectionVisibility(section.id)}
                    className={`p-2 rounded-lg ${
                      section.visible 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {section.visible ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedSection(section);
                      setShowAddProduct(true);
                    }}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Products in this section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.products.map((product) => (
                  <div key={product.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">{product.jersey?.title}</h3>
                      <div className="flex items-center space-x-1">
                        
                        <button
                          onClick={() => removeProductFromSection(section.id,product.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* IMAGE SECTION */}
                    {product.jersey?.image_url && (
                      <img
                        src={product.jersey.image_url}
                        alt={product.jersey.title}
                        className="w-full h-32 object-cover rounded-lg mb-2"
                      />
                    )}        
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{product.jersey?.club}</p>
                      <p>Quality: {product.jersey?.quality}</p>
                      <p className="font-medium text-green-600">₹{product.jersey?.price}</p>
                    </div>
                  </div>
                ))}
                
                {section.products.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No products in this section yet
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {sections.length === 0 && (
            <div className="text-center py-20">
              <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏠</span>
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No homepage sections yet</h2>
              <p className="text-gray-600 mb-6">Create your first section to get started</p>
              <button
                onClick={() => setShowAddSection(true)}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create First Section
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Section</h3>
              <button
                onClick={() => setShowAddSection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={createSection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Title</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                  placeholder="e.g., Top Picks, Best Deals"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Section Type</label>
                <select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value as 'top-picks' | 'best-deals' | 'new-arrivals' | 'trending' | 'custom')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                >
                  <option value="top-picks">Top Picks</option>
                  <option value="best-deals">Best Deals</option>
                  <option value="new-arrivals">New Arrivals</option>
                  <option value="trending">Trending</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSection(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Products to {selectedSection.title}</h3>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setSelectedSection(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search jerseys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {availableJerseys
                .filter(jersey => 
                  !selectedSection.products.some(p => p.jersey_id === jersey.id) &&
                  (jersey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   jersey.club.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((jersey) => (
                  <div key={jersey.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate">{jersey.title}</h4>
                      <button
                        onClick={() => addProductToSection(selectedSection.id,jersey.id)}
                        className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{jersey.club}</p>
                      <p>Quality: {jersey.quality}</p>
                      <p className="font-medium text-green-600">₹{jersey.price}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 