"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase-client";
import toast from "react-hot-toast";

const SellerLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifySeller = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || !session.user) {
        toast.error("You must be logged in.");
        router.push("/login"); // or replace with "/"
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

      if (userData.role !== "seller" && userData.role!=="admin") {
        toast.error("Access denied. Seller only.");
        router.push("/");
        return;
      }

      setIsSeller(true);
      setLoading(false);
    };

    verifySeller();
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return <>{isSeller && children}</>;
};

export default SellerLayout;
