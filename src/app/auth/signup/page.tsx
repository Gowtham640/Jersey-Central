"use client";
import React, { useState, FormEvent,useEffect } from "react";
import { supabase } from "../../supabase-client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { storeSession, clearStoredSession } from "../../utils/session-utils";


export default function SignupPage() {


    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    //const [fullName, setFullName] = useState("");


    const router = useRouter();

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session) {
              // Store session using utility function
              storeSession(session);
            } else {
              // Clear session using utility function
              clearStoredSession();
            }
          }
        );
    
        return () => {
          authListener.subscription.unsubscribe();
        };
      }, []);

    //submitting data to supabase

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSignUp) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email, password, options: {
                    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/signup`,
                },
            })
            if (signUpError) {
                console.log(signUpError);
                toast.error("Signup failed! Please try again.");
                return;
            }
            else {
                // Try to create user in public.users table immediately
                if (signUpData.user) {
                    try {
                        const { error: insertError } = await supabase
                            .from('users')
                            .insert({
                                mail: email,
                                user_id: signUpData.user.id,
                                role: 'buyer'
                            });
                        
                        if (insertError) {
                            console.warn('Could not create user profile yet (will be created on first sign-in):', insertError);
                        }
                    } catch (err) {
                        console.warn('Could not create user profile yet (will be created on first sign-in):', err);
                    }
                }
                toast.success("Check your mail to verify your account", { duration: 2000 });
            }
        }
        else {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) {
                console.log(signInError);
                toast.error("Sign in failed! Please try again.");
                return;
            }
            else {
                // Try to create user in public.users table if they don't exist
                if (signInData.user) {
                    try {
                        const { error: insertError } = await supabase
                            .from('users')
                            .insert({
                                mail: email,
                                user_id: signInData.user.id,
                                role: 'buyer'
                            })
                            .select()
                            .single();
                        
                        if (insertError) {
                            // User might already exist, which is fine
                            console.log('User profile already exists or could not be created:', insertError);
                        }
                    } catch (err) {
                        console.log('Could not create user profile:', err);
                    }
                }
                
                toast.success("Signin successful!", { duration:2000 });
            }
        }
        //toasting
        //clearing data
        setEmail("");
        setPassword("");
        setShowPassword(false);
        //setFullName("");
        //routing
        setTimeout(() => router.push("/"), 2000);
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <div className="bg-white shadow-lg hover:shadow-2xl w-full max-w-[400px] min-h-[350px] rounded-md flex flex-col items-center gap-6 p-6">
                <p className="text-2xl md:text-[30px] font-sans font-extrabold text-black text-center">{isSignUp ? "Sign Up" : "Sign In"}</p>
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5 w-full">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your mail id" className="border-[1px] border-gray-500 h-[42px] w-full max-w-[326px] rounded-lg text-[14px] font-roboto text-gray-600 p-2" required></input>
                    <div className="relative w-full max-w-[326px]">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Enter your password" 
                            className="border-[1px] border-gray-500 h-[42px] w-full rounded-lg text-[14px] font-roboto text-gray-600 p-2 pr-12" 
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.376M21 12c-1.889 1.54-4.208 2.5-6.5 2.5s-4.611-.96-6.5-2.5M21 12c-1.889-1.54-4.208-2.5-6.5-2.5s-4.611.96-6.5 2.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <button type="submit" className="bg-green-600 w-[100px] h-[42px] rounded-md text-[14px] font-roboto text-white">
                        Submit
                    </button>
                </form>
                <p className="text-[14px] font-roboto font-medium text-black text-center">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}<span className="text-green-600 cursor-pointer" onClick={() => { setIsSignUp((prev) => !prev); setShowPassword(false); }}>{isSignUp ? "Sign in" : "Sign up"}</span> </p>

            </div>
        </div>
    )
}