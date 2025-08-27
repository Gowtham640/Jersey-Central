"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase-client";
import { useAuth } from "../providers";
import toast from "react-hot-toast";

const SellerLayout = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const [isSeller, setIsSeller] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifySeller = async () => {
      if (loading) return; // Wait for auth to initialize

      if (!session || !session.user) {
        toast.error("You must be logged in.");
        router.push("/");
        return;
      }

      const userId = session.user.id;

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (userError || !userData) {
        toast.error("Unable to fetch user role.");
        router.push("/");
        return;
      }

      if (userData.role !== "seller" && userData.role !== "admin") {
        toast.error("Access denied. Seller only.");
        router.push("/");
        return;
      }

      setIsSeller(true);
      setVerifying(false);
    };

    verifySeller();
  }, [session, loading, router]);

  if (loading || verifying) return <div>Loading...</div>;
  if (!session) return null;

  return <>{isSeller && children}</>;
};

export default SellerLayout;
