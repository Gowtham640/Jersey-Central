  "use client";
  import { useEffect,useState } from "react";
  import Link from "next/link";
  import {supabase } from "./supabase-client";
  import { useRouter } from "next/navigation";
  

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

  interface User {
    id: number;
    mail: string;
    user_id: string;
    role: string;
    full_name: string;
  }

  export default function Home() {

    //session code

      const [session,setSession]=useState<{ user?: { id: string; email?: string } } | null>(null)
      const [userData, setUserData] = useState<User | null>(null);
  
  //for the menu to log out
  const[showMenu,setShowMenu]=useState(false);

  // Homepage sections state
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);

    const router = useRouter();

    // role for dashboard routing
    const [userRole, setUserRole] = useState<string | null>(null);

    // search state
    const [searchQuery, setSearchQuery] = useState("");


    const fetchSession= async ()=>{
      console.log("Fetching session...");

      const currentSession = await supabase.auth.getSession();
      console.log("Supabase Session:", currentSession);

      setSession(currentSession.data.session);

      // fetch role and user data if logged in
      if (currentSession.data.session?.user?.id) {
        const { data: userRow } = await supabase
          .from("users")
          .select("role, full_name")
          .eq("user_id", currentSession.data.session.user.id)
          .single();
        if (userRow) {
          setUserRole(userRow.role as string);
          setUserData(userRow as User);
        }
      }
    }

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
      fetchSession();
      fetchHomepageSections();

      const{data:authListener}= supabase.auth.onAuthStateChange(async (event,session)=>{

        if(event==="SIGNED_IN" && session){
          const user=session.user;

          const{data: existingUser}=await supabase.from("users").select("mail, full_name").eq("mail",user.email).single();

          if(!existingUser){
            const{error}=await supabase.from("users").insert({
              mail:user.email,
              user_id: session.user.id,
              role:"buyer",
              full_name: 'User', // Default name for new users
            });
            if(error){
              console.log(error);
            } else {
              // Set the user data after successful insert
              setUserData({
                id: 0, // This will be set by the database
                mail: user.email || '',
                user_id: session.user.id,
                role: 'buyer',
                full_name: 'User'
              });
              setUserRole('buyer');
            }
          }
          else{
            console.log("User already exists.");
            // Fetch user data for existing user
            if (session.user?.id) {
              const { data: userRow } = await supabase
                .from("users")
                .select("role, full_name")
                .eq("user_id", session.user.id)
                .single();
              if (userRow) {
                setUserRole(userRow.role as string);
                setUserData(userRow as User);
              }
            }
          }
        }
        setSession(session)
      })

      return()=>{
        authListener.subscription.unsubscribe();
      }

    },[])

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




    return (
      //main div tag
      <div className="flex gap-8 md:gap-20 flex-col items-center w-full">


        <div className={`relative w-full h-[250px] md:h-[350px] flex justify-center items-center flex-col gap-6 ${
        session ? 'bg-black' : 'bg-blue-600'
      }`}> {/* The black box on top */}

          {/* this is the svg for profile/signup  */}
          <div className="absolute right-4 md:right-[100px] top-4 flex items-center gap-3">
            {session && userData && (
              <div className="text-white text-sm font-medium hidden sm:block">
                Hey, {userData.full_name.split(' ')[0]}!
              </div>
            )}
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
                  <div className="absolute top-10 z-50 bg-white border shadow-md rounded-md w-[160px] h-auto flex flex-col">
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
                        setSession(null);
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
            )}
          </div>

          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#D9D9D9" className="absolute right-16 md:right-[60px] top-4 cursor-pointer" onClick={()=>router.push('/buyer/cart')}><path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/></svg>

          {/* Removed the orders/news SVG */}

          <p className="text-3xl md:text-[64px] text-white font-sans font-bold text-center px-4">Wear your passion</p>
          <div className="flex flex-col sm:flex-row gap-2 items-center w-full max-w-[280px] px-4">
            <input value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ handleSearch(); } }} type="text" placeholder="Find your jersey" className="bg-white h-[36px] w-full rounded-lg text-[14px] font-roboto text-gray-600 px-3" />
            <button onClick={handleSearch} className="h-[36px] px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[14px] whitespace-nowrap">Search</button>
          </div>
        </div>

{/* rest of the body i.e footbar and rest */}
        
        {/*Sidebar  */}
        {/* Removed the sidebar */}

        {/* Dynamic Homepage Sections */}
        {homepageSections.map((section) => (
          section.visible && (
            <div key={section.id} className="relative bg-white w-full max-w-[1200px] h-auto min-h-[520px] rounded-lg flex flex-col md:flex-row items-center justify-evenly pt-12 mb-10 shadow-xl hover:shadow-2xl p-6"> 
              <p className="absolute top-6 text-2xl md:text-[28px] font-sans font-bold text-black">{section.title}</p>
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 mt-20 md:mt-0">
                {section.products.length > 0 ? (
                  section.products.slice(0, 3).map((product: HomepageProduct) => (
                    <div onClick={() => router.push(`/buyer/${product.jersey_id}`)} key={product.id} className="bg-gray-50 w-full md:w-[320px] h-[380px] rounded-lg p-5 cursor-pointer hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100">
                      <img 
                        src={getFirstImageUrl(product.jersey?.image_url)} 
                        alt={product.jersey?.title}
                        className="w-full h-56 object-cover rounded-lg mb-3"
                      />
                      <h3 className="font-semibold text-base text-black truncate mb-2">{product.jersey?.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.jersey?.quality}</p>
                      <p className="font-bold text-lg text-black">₹{product.jersey?.price}</p>
                    </div>
                  ))
                ) : (
                  // Placeholder boxes when no products
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="bg-gray-50 w-full md:w-[320px] h-[380px] rounded-lg flex items-center justify-center shadow-lg border border-gray-100">
                      <p className="text-gray-500 text-sm">No products yet</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        ))}

        


      </div>
    );
  }