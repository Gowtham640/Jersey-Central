'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../supabase-client';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/solid';
import toast from "react-hot-toast";


interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
}

interface Jersey {
  id: string;
  title: string;
  price: number;
  image_url: string[]; // array of images
  club?: string;
  quality?: string;
  description?: string;
  reviews?: Review[];
}

interface SizeOption {
  id: string;
  size: string;
  stock: number;
}

function JerseyDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [jersey, setJersey] = useState<Jersey | null>(null);
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [showImageModal, setShowImageModal] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  useEffect(() => {
    const fetchJersey = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      // Fetch jersey data
      const { data: jerseyData, error: jerseyError } = await supabase
        .from('jerseys')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (jerseyError) {
        console.error(jerseyError);
        setLoading(false);
        return;
      }

      if (!jerseyData) {
        setLoading(false);
        return;
      }

      // Parse image_url as array if stored as JSON string
      let images: string[] = [];
      try {
        images = Array.isArray(jerseyData.image_url)
          ? jerseyData.image_url
          : JSON.parse(jerseyData.image_url);
      } catch {
        images = [jerseyData.image_url];
      }

      setJersey({ ...jerseyData, image_url: images });
      setSelectedImage(images[0] || null);

      // Fetch sizes from jersey_stock
      const { data: stockData, error: stockError } = await supabase
        .from('jersey_stock')
        .select('*')
        .eq('jersey_id', id)
        .order('size', { ascending: true });

      if (stockError) {
        console.error(stockError);
      } else {
        const availableSizes = stockData.filter((s) => s.stock > 0);
        setSizes(availableSizes);
      }

      setLoading(false);
    };

    fetchJersey();
  }, [id]);


    const handleCart = async () => {
      if (!selectedSize) {
        toast.error('Please select a size before adding to cart.');
        return;
      }
  
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
  
      if (userError || !user) {
        toast.error('You must be logged in to add items to the cart.');
        return;
      }
  
      const { error } = await supabase.from('cart_items').insert({
        user_id: user.id,
        jersey_id: id,
        size: selectedSize,
        quantity: quantity,
      });
  
      if (error) {
        console.error('Error adding to cart:', error.message);
        toast.error('Could not add item to cart.');
      } else {
        toast.success('Item added to cart!');
        router.push('/buyer/cart');
      }
      router.push("/buyer/cart");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
    </div>
  );
  if (!jersey) return <p className="text-center mt-8">No jersey found.</p>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-black text-white">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#D9D9D9" className="absolute right-[60px] top-4" onClick={()=>router.push('/buyer/cart')}><path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/></svg>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 onClick={() => router.push('/')} className="text-5xl font-sans font-bold">JC</h1>
        </div>
      </header>

      {/* Product Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Carousel */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
            {selectedImage && (
              <img
                src={selectedImage}
                alt={jersey.title}
                className="w-full h-auto max-h-[500px] object-cover rounded-md mb-4 cursor-zoom-in"
                onClick={() => setShowImageModal(true)}
              />
            )}
            <div className="flex space-x-2 overflow-x-auto">
              {jersey.image_url.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${jersey.title} ${idx + 1}`}
                  className={`w-24 h-24 object-cover rounded cursor-pointer border-2 ${
                    selectedImage === img ? 'border-green-600' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">{jersey.title}</h2>
            <p className="text-xl font-semibold text-gray-900">₹{jersey.price}</p>
            {jersey.club && <p className="text-gray-600">Club: {jersey.club}</p>}
            {jersey.quality && <p className="text-gray-600">Quality: {jersey.quality}</p>}
            {jersey.description && <p className="text-gray-800">{jersey.description}</p>}

            <button onClick={() => setShowSizeChart(true)} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
              View Size Chart
            </button>

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div>
                <p className="font-medium text-gray-700 mb-2">Select Size:</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <label
                      key={s.id}
                      className={`cursor-pointer text-gray-700 px-4 py-2 border rounded ${
                        selectedSize === s.size ? 'border-green-600 bg-green-50' : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="size"
                        value={s.size}
                        checked={selectedSize === s.size}
                        onChange={() => setSelectedSize(s.size)}
                        className="hidden"
                      />
                      {s.size} {s.stock < 3 ? `(Only few left!)` : ''}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="flex items-center space-x-4 mt-4">
              <label htmlFor="quantity" className="font-medium text-gray-700">
                Quantity:
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                min={1}
                max={selectedSize ? sizes.find((s) => s.size === selectedSize)?.stock : undefined}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-20 px-2 text-black py-1 border rounded"
              />
            </div>
            <button className="px-6 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 mt-2" onClick={handleCart}>
              Add to Cart
            </button>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
          {jersey.reviews && jersey.reviews.length > 0 ? (
            <div className="space-y-4">
              {jersey.reviews.map((review) => (
                <div key={review.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-900">{review.user}</span>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No reviews yet.</p>
          )}
        </section>
      </main>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <img src={selectedImage} alt={jersey.title} className="max-h-[90vh] max-w-[90vw] object-contain" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setShowImageModal(false)}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Size Chart Modal */}
      {showSizeChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Size Chart</h3>
              <button onClick={() => setShowSizeChart(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-900">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-6">Size</th>
                    <th className="py-2 pr-6">Chest (in)</th>
                    <th className="py-2 pr-6">Length (in)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { size: 'S', chest: '36-38', length: '27' },
                    { size: 'M', chest: '38-40', length: '28' },
                    { size: 'L', chest: '40-42', length: '29' },
                    { size: 'XL', chest: '42-44', length: '30' },
                    { size: 'XXL', chest: '44-46', length: '31' },
                  ].map((row) => (
                    <tr key={row.size}>
                      <td className="py-2 pr-6">{row.size}</td>
                      <td className="py-2 pr-6">{row.chest}</td>
                      <td className="py-2 pr-6">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JerseyDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <JerseyDetailContent />
    </Suspense>
  );
}
