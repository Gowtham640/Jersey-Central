  "use client";
  import { useEffect,useState } from "react";
  import Link from "next/link";
  import {supabase } from "./supabase-client";
  import { useRouter } from "next/navigation";
  import { useAuth } from "./providers";
  import { clearStoredSession } from "./utils/session-utils";
  

  interface HomepageProduct {
    id: string;
    jersey_id: string;
    order_index: number;
    jersey: {
      id: string;
      title: string;
      price: number;
      image_url: string | string[];
      club?: string;
      quality?: string;
    };
  }

  interface HomepageSection {
    id: string;
    title: string;
    visible: boolean;
    homepage_products: HomepageProduct[];
    products: HomepageProduct[];
  }

  export default function Home() {

    // Use the new authentication context
    const { session, loading } = useAuth();
  
  //for the menu to log out
  const[showMenu,setShowMenu]=useState(false);

  // Homepage sections state
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);

    const router = useRouter();

    // role for dashboard routing
    const [userRole, setUserRole] = useState<string | null>(null);

    // search state
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch user role when session changes
    const fetchUserRole = async (userId: string) => {
      const { data: roleRow } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (roleRow?.role) {
        setUserRole(roleRow.role as string);
      }
    };

    const fetchHomepageSections = async () => {
      try {
        const { data, error } = await supabase
          .from('homepage_sections')
          .select(`
            *,
            homepage_products(
              *,
              jersey:jerseys(id, title, price, image_url, club, quality)
            )
          `)
          .eq('visible', true)
          .order('order_index');

        if (error) {
          console.error('Error fetching homepage sections:', error);
          return;
        }

        // Transform the data to match our interface
        const transformedSections = (data || []).map((section: HomepageSection) => ({
          ...section,
          products: (section.homepage_products || []).map((product: HomepageProduct) => ({
            ...product,
            jersey: product.jersey
          })).sort((a: HomepageProduct, b: HomepageProduct) => a.order_index - b.order_index)
        }));

        setHomepageSections(transformedSections);
      } catch (error) {
        console.error('Error in fetchHomepageSections:', error);
      }
    };

    useEffect(()=>{
      fetchHomepageSections();

      // Fetch user role when session is available
      if (session?.user?.id) {
        fetchUserRole(session.user.id);
      }
    },[session])

    const handleSearch = () => {
      const query = (searchQuery || "").trim();
      const url = query ? `/buyer?q=${encodeURIComponent(query)}` : "/buyer";
      router.push(url);
    };

    const getFirstImageUrl = (imageUrl: string | string[]): string => {
      if (!imageUrl) return "";
      try {
        const parsed = typeof imageUrl === "string" ? JSON.parse(imageUrl) : imageUrl;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0];
        }
        return typeof imageUrl === "string" ? imageUrl : "";
      } catch {
        return typeof imageUrl === "string" ? imageUrl : "";
      }
    };

    // Show loading state while auth is initializing
    if (loading) {
      return (
        <div className="flex gap-8 md:gap-16 lg:gap-20 flex-col items-center w-full">
          <div className="w-full h-[200px] sm:h-[250px] md:h-[300px] bg-gray-300 animate-pulse flex items-center justify-center">
            <div className="text-white text-xl">Loading...</div>
          </div>
        </div>
      );
    }

    return (
      //main div tag
      <div className="flex gap-8 md:gap-16 lg:gap-20 flex-col items-center w-full">

        <div className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex justify-center items-center flex-col gap-2 bg-black"> {/* The black box on top */}

          {/* this is the svg for profile/signup  */}
          <div className="absolute right-[50px] sm:right-[50px] md:right-[100px] top-4">
            {session ? (
              // Logged in → show button that toggles dropdown
              <div className="relative">
                <button onClick={() => setShowMenu((prev) => !prev)}>
                  {/* Profile SVG */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#CCCCCC"
                  >
                    <path d="M485-240Zm26 80H160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440v80q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32h245q4 21 10.5 41t15.5 39Zm209 80q-73-18-116.5-80T560-298v-102l160-80 160 80v102q0 76-43.5 138T720-80Zm0-84q38-18 59-55t21-79v-52l-80-40-80 40v52q0 42 21 79t59 55ZM480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm240 363Z" />
                  </svg>
                </button>

                {/* Dropdown */}
                {showMenu && (
                  <div className="absolute top-10 right-0 z-50 bg-white border shadow-md rounded-md w-[160px] h-auto flex flex-col">
                    {userRole === "seller" && (
                      <button
                        className="w-full text-[12px] font-roboto text-black rounded-md hover:bg-gray-100 py-1"
                        onClick={() => { setShowMenu(false); router.push("/seller"); }}
                      >
                        Seller Dashboard
                      </button>
                    )}
                    {userRole === "admin" && (
                      <button
                        className="w-full text-[12px] font-roboto text-black rounded-md hover:bg-gray-100 py-1"
                        onClick={() => { setShowMenu(false); router.push("/admin"); }}
                      >
                        Admin Dashboard
                      </button>
                    )}
                    <button
                      className="w-full text-[12px] font-roboto text-black rounded-md hover:bg-gray-100 py-1"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setShowMenu(false);
                        setUserRole(null);
                        clearStoredSession();
                        window.location.reload(); // or use router.push("/") if you want
                      }}
                    >
                      Sign out
                    </button>
                    {(!userRole || userRole === "buyer") && (
                      <button
                        className="w-full text-[12px] font-roboto text-black rounded-md hover:bg-gray-100 py-1"
                        onClick={() => { setShowMenu(false); router.push("/request"); }}
                      >
                        Become a seller
                      </button>
                    )}
                    <button
                      className="w-full text-[12px] font-roboto text-black rounded-md hover:bg-gray-100 py-1"
                      onClick={() => { setShowMenu(false); router.push("/buyer/orders"); }}
                    >
                      Orders
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Not logged in → route to signup
              <div className="flex flex-col items-center">
                <Link href="/auth/signup">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#CCCCCC"
                  >
                    <path d="M485-240Zm26 80H160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440v80q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32h245q4 21 10.5 41t15.5 39Zm209 80q-73-18-116.5-80T560-298v-102l160-80 160 80v102q0 76-43.5 138T720-80Zm0-84q38-18 59-55t21-79v-52l-80-40-80 40v52q0 42 21 79t59 55ZM480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm240 363Z" />
                  </svg>
                </Link>
                <span className="text-[10px] sm:text-[12px] md:text-[14px] text-white mt-1 font-sans font-medium" onClick={()=>router.push('/auth/signup')}>Sign in</span>
              </div>
            )}
          </div>

          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#D9D9D9" className="absolute right-2 sm:right-4 md:right-[60px] top-4 cursor-pointer" onClick={()=>router.push('/buyer/cart')}><path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/></svg>

          {/* Removed the orders/news SVG */}

          <p className="text-[20px] sm:text-[48px] md:text-[64px] text-white font-sans font-bold text-center px-4">Wear your passion</p>
          <div className="flex gap-2 items-center flex-col sm:flex-row">
            <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ handleSearch(); } }} type="text" placeholder="Find your jersey" className="bg-white h-[32px] w-[120px] sm:w-[126px] md:w-[226px] rounded-lg text-[14px] font-roboto text-gray-600 p-2" />
            <button onClick={handleSearch} className="h-[32px] px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[14px]">Search</button>
          </div>
        </div>

{/* rest of the body i.e footbar and rest */}
        
        {/*Sidebar  */}
        {/* Removed the sidebar */}

        {/* Dynamic Homepage Sections */}
        {homepageSections.map((section) => (
          section.visible && (
            <div key={section.id} className="relative left-0 sm:left-2 md:left-4 bg-white w-full max-w-[1000px] h-auto rounded-md flex flex-col items-center justify-start pt-16 sm:pt-20 md:pt-10 pb-8 mb-8 shadow-lg hover:shadow-2xl px-4 sm:px-6 md:px-8"> 
              <p className="absolute top-[1px] text-[18px] sm:text-[20px] md:text-[24px] font-sans font-bold text-black">{section.title}</p>
              {section.products.length > 0 ? (
                <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 w-full justify-center items-start">
                  {section.products.map((product: HomepageProduct) => (
                    <div onClick={() => router.push(`/buyer/${product.jersey_id}`)} key={product.id} className="bg-gray-100 w-full max-w-[250px] h-[250px] sm:h-[280px] md:h-[300px] rounded-md p-3 sm:p-4 cursor-pointer hover:bg-gray-200 transition-colors shadow-md flex-shrink-0">
                      <img 
                        src={getFirstImageUrl(product.jersey?.image_url)} 
                        alt={product.jersey?.title}
                        className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-md mb-2"
                      />
                      <h3 className="font-semibold text-sm text-black truncate">{product.jersey?.title}</h3>
                      <p className="text-xs text-gray-700">{product.jersey?.quality}</p>
                      <p className="font-bold text-sm text-black">₹{product.jersey?.price}</p>
                    </div>
                  ))}
                </div>
              ) : (
                // Placeholder boxes when no products
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-8 w-full justify-center items-center">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-gray-100 w-full max-w-[250px] h-[250px] sm:h-[280px] md:h-[300px] rounded-md flex items-center justify-center shadow-md">
                      <p className="text-gray-500 text-sm">No products yet</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ))}

        {/* Contact/Help Section */}
        <div className="w-full bg-black p-6 sm:p-8 ">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Need Help?</h2>
            <p className="text-gray-300 text-sm sm:text-base">We're here to help you find the perfect jersey</p>
          </div>
          
          <div className="flex justify-center items-center gap-6">
            {/* Contact Info */}
            <div className="text-center">
              <div className="bg-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Call Us</h3>
              <p className="text-sm text-gray-300">+91 9573650989</p>
              
            </div>

            {/* Email */}
            <div className="text-center">
              <div className="bg-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Email Us</h3>
              <p className="text-sm text-gray-300">grizigowtham@gmail.com</p>

            </div>

            
          </div>
        </div>

      </div>
    );
  }