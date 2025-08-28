"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../supabase-client";
import toast from "react-hot-toast";

function CreateUserContent() {
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    const createUser = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setError("User not authenticated");
          setIsCreating(false);
          return;
        }

        // Check if user already exists in public.users
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (existingUser) {
          // User already exists, redirect to intended route
          router.push(redirectTo);
          return;
        }

        // Create user in public.users table
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            mail: user.email,
            user_id: user.id,
            role: "buyer"
          });

        if (insertError) {
          console.error("Failed to create user:", insertError);
          setError("Failed to create user profile");
          setIsCreating(false);
          return;
        }

        // Success! Redirect to intended route
        toast.success("Profile created successfully!");
        router.push(redirectTo);

      } catch (err) {
        console.error("Error creating user:", err);
        setError("An unexpected error occurred");
        setIsCreating(false);
      }
    };

    createUser();
  }, [router, redirectTo]);

  if (isCreating) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Creating your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function CreateUserPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateUserContent />
    </Suspense>
  );
}
