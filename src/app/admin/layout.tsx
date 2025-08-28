"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase-client";
import { useAuth } from "../providers";
import toast from "react-hot-toast";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifyAdmin = async () => {
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

      if (userData.role !== "admin") {
        toast.error("Access denied. Admins only.");
        router.push("/");
        return;
      }

      setIsAdmin(true);
      setVerifying(false);
    };

    verifyAdmin();
  }, [session, loading, router]);

  if (loading || verifying) return <div>Loading...</div>;
  if (!session) return null;

  return <>{isAdmin && children}</>;
};

export default AdminLayout;
