'use client';

import { useState } from 'react';
import { supabase } from '../supabase-client';
import { useRouter } from 'next/navigation';

export default function SellerRequestForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    instagram_link: '',
    whatsapp_number: '',
    store_name: '',
    years_in_business: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMessage('You must be logged in to submit this form.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('seller_requests').insert([
        {
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          email: formData.email,
          instagram_link: formData.instagram_link || null,
          whatsapp_number: formData.whatsapp_number || null,
          store_name: formData.store_name,
          years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
          address: formData.address,
        },
      ]);

      if (error) throw error;

      setMessage('Your request has been submitted! We’ll contact you soon.');
      setFormData({
        full_name: '',
        phone_number: '',
        email: '',
        instagram_link: '',
        whatsapp_number: '',
        store_name: '',
        years_in_business: '',
        address: '',
      });

      setTimeout(() => router.push('/'), 2000);
    } catch (err: any) {
      console.error('Error submitting seller request:', JSON.stringify(err, null, 2));
      setMessage(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-lg ">
      {/* Header */}
      <h1 className="text-3xl font-bold text-black mb-6 text-center">Seller Form</h1>

      {message && (
        <div className="mb-4 p-3 bg-gray-100 text-black text-sm rounded">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder="Full Name"
          required
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="Phone Number"
          required
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
          required
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="instagram_link"
          value={formData.instagram_link}
          onChange={handleChange}
          placeholder="Instagram Link (optional)"
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="whatsapp_number"
          value={formData.whatsapp_number}
          onChange={handleChange}
          placeholder="WhatsApp Number (optional)"
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="store_name"
          value={formData.store_name}
          onChange={handleChange}
          placeholder="Store Name"
          required
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="years_in_business"
          type="number"
          value={formData.years_in_business}
          onChange={handleChange}
          placeholder="Years in Business"
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />
        <input
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Address"
          className="border bg-gray-200 p-2 w-full rounded text-black"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
