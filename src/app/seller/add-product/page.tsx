'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { PlusIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import {supabase } from "../../supabase-client";
import { useRouter } from 'next/navigation';
import toast from "react-hot-toast";

type SizeData = {
  available: boolean;
  stock: number;
};



type ProductData = {
  title: string;
  club: string;
  season: string;
  price: string;
  quality: string;
  sizes: Record<string, SizeData>;
  tags: string[];
};

export default function AddProduct() {
  const router=useRouter();
  const [data, setData] = useState<ProductData>({
    title: '',
    club: '',
    season: '',
    price: '',
    quality: '',
    sizes: {
      S: { available: false, stock: 0 },
      M: { available: false, stock: 0 },
      L: { available: false, stock: 0 },
      XL: { available: false, stock: 0 }
    },
    tags: []
  });

  const [jerseyImage,setJerseyImage]=useState<File[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange=(e: ChangeEvent<HTMLInputElement>)=>{
    if(e.target.files && e.target.files.length > 0){
      setJerseyImage(prev => [...(prev || []), ...Array.from(e.target.files!)]);
    }
  };

  const handleSizeChange = (size: string, field: 'available' | 'stock', value: boolean | number) => {
    setData(prev => ({
      ...prev,
      sizes: {
        ...prev.sizes,
        [size]: {
          ...prev.sizes[size as keyof typeof prev.sizes],
          [field]: value
        }
      }
    }));
  };

  const uploadImage=async(files:File[]): Promise<string[]|null>=>{
    const urls:string[]=[];

    for(const file of files){
      const filePath=`${file.name}-${Date.now()}`;
      const{error:uploadError}=await supabase.storage.from("jersey-images").upload(filePath,file);
      if (uploadError) {
        console.error("❌ Error uploading the image to Supabase Storage:", uploadError.message);
        alert(`Image upload failed: ${uploadError.message}`);
        return null;
      }
  
      const{data:publicUrlData}=supabase.storage.from("jersey-images").getPublicUrl(filePath)
      if (!publicUrlData?.publicUrl) {
        console.error("❌ Could not generate a public URL for the uploaded image");
        alert("Could not generate a public URL for the uploaded image.");
        return null;
      }
      console.log("✅ Image uploaded successfully. Public URL:", publicUrlData.publicUrl);
      urls.push(publicUrlData.publicUrl);
    }
    return urls;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

//this is to see if the image is null
    let imageUrls:string[] | null=null;
    if(jerseyImage){
      imageUrls=await uploadImage(jerseyImage)
    }

    const{data:{user},error:userError}=await supabase.auth.getUser();

    if(userError){
      console.error("❌ Error getting logged in user:", userError.message);
      alert("Error getting your account information. Please log in again.");
      return;
    }
    
    if (!user) {
      alert("You must be logged in to add a jersey.");
      return;
    }
//inserting the data into the jerseys table
    const{data:insertData,error}=await supabase.from('jerseys').insert([
      {
        title:data.title,
        price:Number(data.price),
        club:data.club,
        seller_id:user.id,
        season:data.season,
        image_url:imageUrls,
        quality:data.quality,
      }
    ]).select();

    if (error) {
      console.error("❌ Insert failed:", error.message, error.details);
      alert(`Insert failed: ${error.message}`);
      return;
    }

    const newJerseyId = insertData[0].id;

  // 4️⃣ Prepare jersey_stock inserts
  const stockRows = Object.entries(data.sizes)
    .filter(([, sizeData]: [string, SizeData]) => sizeData.available && sizeData.stock > 0)
    .map(([size, sizeData]: [string, SizeData]) => ({
      jersey_id: newJerseyId,
      size: size,
      stock: sizeData.stock
    }));

  // 5️⃣ Insert into jersey_stock (only if there’s stock data)
  if (stockRows.length > 0) {
    const { error: stockError } = await supabase
      .from('jersey_stock')
      .insert(stockRows);

    if (stockError) {
      console.error("❌ Stock insert failed:", stockError.message);
      alert(`Stock insert failed: ${stockError.message}`);
      return;
    }
  }

    console.log('✅ Jersey and stock added successfully');
    toast.success("Product added successfully!");
    router.push('/seller');

    console.log('Form data:', insertData);
    console.log('Images:', jerseyImage);
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
            <h1 className="text-2xl font-bold text-white">Add New Product</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border-0 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Title *</label>
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="e.g., Manchester United Home Jersey 2024"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Club/Team *</label>
                  <input
                    type="text"
                    value={data.club}
                    onChange={(e) => setData(prev => ({ ...prev, club: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="e.g., Manchester United"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Season *</label>
                  <input
                    type="text"
                    value={data.season}
                    onChange={(e) => setData(prev => ({ ...prev, season: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="e.g., 2024/25"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                  <input
                    type="number"
                    value={data.price}
                    onChange={(e) => setData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quality *</label>
                <select
                  value={data.quality}
                  onChange={(e) => setData(prev => ({ ...prev, quality: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Select Quality</option>
                  <option value="First Copy">First Copy</option>
                  <option value="Master Version">Master Version</option>
                  <option value="Embroidery">Embroidery</option>
                  <option value="Printed">Printed</option>
                  <option value="Imported">Imported</option>
                </select>
              </div>
            </div>

            {/* Size and Stock Management */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Size & Stock Management</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.sizes).map(([size, sizeData]: [string, SizeData]) => (
                  <div key={size} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="checkbox"
                        checked={sizeData.available}
                        onChange={(e) => handleSizeChange(size, 'available', e.target.checked)}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label className="text-sm font-medium text-gray-900">{size}</label>
                    </div>
                    
                    {sizeData.available && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Stock</label>
                        <input
                          type="number"
                          value={sizeData.stock}
                          onChange={(e) => handleSizeChange(size, 'stock', parseInt(e.target.value) || 0)}
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

            {/* Image Upload */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Product Images</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Upload Images
                </button>
                
                <p className="mt-2 text-sm text-gray-600">
                  Upload multiple images for your product
                </p>
              </div>
              
              {/* Image Preview */}
              {jerseyImage && jerseyImage.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {jerseyImage.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setJerseyImage(prev => prev?.filter((_, i) => i !== index) || null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Add Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 