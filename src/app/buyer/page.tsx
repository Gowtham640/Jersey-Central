'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../supabase-client';

interface JerseyRecord {
	id: string;
	title: string;
	price: number;
	image_url: any;
	club?: string;
	quality?: string;
	season?: string;
	jersey_stock?: { size: string; stock: number }[];
}

export default function BuyerSearchPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const [loading, setLoading] = useState<boolean>(true);
	const [results, setResults] = useState<JerseyRecord[]>([]);
	const [error, setError] = useState<string | null>(null);

	// filters
	const [quality, setQuality] = useState<string>('');
	const [club, setClub] = useState<string>('');
	const [size, setSize] = useState<string>('');
	const [sortBy, setSortBy] = useState<string>('relevance');
	const [attempts, setAttempts] = useState<Record<string, number>>({});
	const [isLoading, setIsLoading] = useState(true);

	const q = searchParams.get('q')?.trim() || '';

	useEffect(() => {
		const fetchResults = async () => {
			setLoading(true);
			setError(null);
			try {
				let query = supabase
					.from('jerseys')
					.select('id, title, price, image_url, club, quality, season, jersey_stock(size, stock)');

				if (q) {
					// Flexible search across multiple columns
					query = query.or(`title.ilike.%${q}%,club.ilike.%${q}%,quality.ilike.%${q}%,season.ilike.%${q}%`);
				}

				const { data, error } = await query.limit(200);
				if (error) {
					throw error;
				}
				
				setResults((data || []) as JerseyRecord[]);
			} catch (err: any) {
				setError(err?.message || 'Failed to fetch results');
			} finally {
				setLoading(false);
			}
		};
		fetchResults();
	}, [q]);

	const validateImageUrl = (url: string): boolean => {
		// Check if it's a valid Supabase storage URL
		if (url && typeof url === 'string') {
			// Supabase storage URLs typically contain the bucket name and file path
			return url.includes('supabase.co') || url.includes('storage.googleapis.com') || url.startsWith('http');
		}
		return false;
	};

	const FALLBACK_SVG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFM0U2RUEiLz48L3N2Zz4=';

	const handleImageError = (
		productId: string,
		originalImageUrl: any,
		e: React.SyntheticEvent<HTMLImageElement>
	  ) => {
		const target = e.target as HTMLImageElement;
		const retryCount = attempts[productId] || 0;
	  
		if (retryCount < 1) {
		  const retrySrc = encodeURI(getFirstImageUrl(originalImageUrl));
		  setAttempts((prev) => ({ ...prev, [productId]: retryCount + 1 }));
		  target.src = retrySrc || FALLBACK_SVG;
		} else {
		  target.src = FALLBACK_SVG; // guaranteed to exist
		}
	};

	const getFirstImageUrl = (imageUrl: any): string => {
		try {
		  if (!imageUrl) return '';
	  
		  // If stringified JSON array, parse it
		  if (typeof imageUrl === 'string' && imageUrl.trim().startsWith('[')) {
			imageUrl = JSON.parse(imageUrl);
		  }
	  
		  // If single string, validate
		  if (typeof imageUrl === 'string') {
			return validateImageUrl(imageUrl) ? imageUrl : '';
		  }
	  
		  // If array, pick the first valid string
		  if (Array.isArray(imageUrl)) {
			const firstValid = imageUrl.find(
			  (u) => typeof u === 'string' && validateImageUrl(u)
			);
			return firstValid || '';
		  }
	  
		  return '';
		} catch {
		  return '';
		}
		
	  };

	const normalizedResults = useMemo(() => {
		if (!results) return [];
		
		let arr = [...results];
		
		// Apply filters
		if (quality && quality !== 'all') {
			arr = arr.filter(item => item.quality === quality);
		}
		if (club && club !== 'all') {
			arr = arr.filter(item => item.club === club);
		}
		if (size && size !== 'all') {
			arr = arr.filter(item => item.jersey_stock?.some(stock => stock.size === size && stock.stock > 0));
		}
		
		// Apply sorting
		switch (sortBy) {
			case 'price-low':
				arr.sort((a, b) => a.price - b.price);
				break;
			case 'price-high':
				arr.sort((a, b) => b.price - a.price);
				break;
			case 'title-az':
				arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
				break;
			case 'title-za':
				arr.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
				break;
			default:
				break;
		}
		
		return arr;
	}, [results, quality, club, size, sortBy]);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white shadow-sm border-0">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
					<button
						onClick={() => router.push('/')}
						className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors duration-200"
					>
						← Back to Home
					</button>
				</div>
			</div>

			{/* Filters + Summary */}
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="bg-white rounded-lg shadow-sm border-0 p-6 mb-8">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
						<div className="space-y-4">
							<div className="flex items-center gap-2">
								<p className="text-gray-700">Showing results for</p>
								<span className="font-semibold text-gray-900 text-lg">{q || 'All Jerseys'}</span>
							</div>
							{/* Filters Row with labels and improved styling */}
							<div className="flex flex-wrap gap-4">
								<div className="flex-1 min-w-[200px]">
									<label className="block text-sm font-medium text-gray-700 mb-2">Club/Team</label>
									<input
										type="text"
										value={club}
										onChange={(e) => setClub(e.target.value)}
										placeholder="Filter by club..."
										className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
									/>
								</div>
								<div className="flex-1 min-w-[200px]">
									<label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
									<select
										value={quality}
										onChange={(e) => setQuality(e.target.value)}
										className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
									>
										<option value="all">All Qualities</option>
										<option value="Fan Version">Fan Version</option>
										<option value="First Copy">First Copy</option>
									</select>
								</div>
								<div className="flex-1 min-w-[200px]">
									<label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
									<select
										value={size}
										onChange={(e) => setSize(e.target.value)}
										className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
									>
										<option value="all">All Sizes</option>
										<option value="S">S</option>
										<option value="M">M</option>
										<option value="L">L</option>
										<option value="XL">XL</option>
										<option value="XXL">XXL</option>
									</select>
								</div>
								<div className="flex-1 min-w-[200px]">
									<label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
									<select
										value={sortBy}
										onChange={(e) => setSortBy(e.target.value)}
										className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent text-gray-900"
									>
										<option value="default">Default</option>
										<option value="price-low">Price: Low to High</option>
										<option value="price-high">Price: High to Low</option>
										<option value="title-az">Title: A-Z</option>
										<option value="title-za">Title: Z-A</option>
									</select>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="text-right">
								<p className="text-2xl font-bold text-gray-900">{normalizedResults.length}</p>
								<p className="text-sm text-gray-600">Products found</p>
							</div>
						</div>
					</div>
				</div>

				{/* Results grid with improved loading/error/no-results states and product card styling */}
				{loading ? (
					<div className="flex items-center justify-center py-20">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Searching for jerseys...</p>
						</div>
					</div>
				) : error ? (
					<div className="text-center py-20">
						<div className="text-red-600 text-lg font-medium mb-2">Search Error</div>
						<p className="text-gray-600 mb-4">{error}</p>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
							Try Again
						</button>
					</div>
				) : normalizedResults.length === 0 ? (
					<div className="text-center py-20">
						<div className="text-gray-600 text-lg font-medium mb-2">No jerseys found</div>
						<p className="text-gray-500 mb-4">Try adjusting your search criteria or filters</p>
						<button
							onClick={() => router.push('/')}
							className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
						>
							Browse All Jerseys
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{normalizedResults.map((product) => (
							<div
								key={product.id}
								className="bg-white rounded-lg shadow-sm border-0 hover:shadow-lg transition-all duration-300 cursor-pointer group"
								onClick={() => router.push(`/buyer/${product.id}`)}
							>
								
								<div className="relative overflow-hidden rounded-t-lg">
								{(() => {
								console.log('DEBUG - Product:', product.title, 'URL:', getFirstImageUrl(product.image_url));
								return null; // makes it a valid JSX expression
								})()}
										{getFirstImageUrl(product.image_url) ? (
										<img
											src={getFirstImageUrl(product.image_url)}
											alt={product.title}
											className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
											onLoad={() => setIsLoading(false)}
											onError={(e) => handleImageError(product.id,product.image_url,e)}
										/>
									) : (
										// Show placeholder when no image URL is available
										<div className="w-full h-56 bg-gray-200 flex items-center justify-center">
											<div className="text-center">
												<div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2">
													<span className="text-2xl">🏷️</span>
												</div>
												<p className="text-sm text-gray-500">No Image</p>
											</div>
										</div>
									)}
									<div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
								</div>
								
								<div className="p-4">
									<h3 className="font-semibold text-gray-900 truncate mb-2 group-hover:text-green-600 transition-colors">
										{product.title}
									</h3>
									<div className="flex items-center justify-between mb-3">
										<p className="text-sm text-gray-600">{product.quality}</p>
										{product.club && (
											<span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
												{product.club}
											</span>
										)}
									</div>
									<p className="font-bold text-xl text-green-600">₹{product.price}</p>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
