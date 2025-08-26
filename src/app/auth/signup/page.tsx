"use client";
import React, { useState, FormEvent } from "react";
import { supabase } from "../../supabase-client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";


export default function SignupPage() {


    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    const router = useRouter();


    //submitting data to supabase

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSignUp) {
            const { error: signUpError } = await supabase.auth.signUp({
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
                toast.success("Signup successful! Check your mail.", { duration: 2000 });
            }
        }
        else {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) {
                console.log(signInError);
                toast.error("Sign in failed! Please try again.");
                return;
            }
            else {
                toast.success("Signin successful!", { duration: 2000 });
            }
        }
        //toasting
        //clearing data
        setEmail("");
        setPassword("");
        //routing
        setTimeout(() => router.push("/"), 2000);
    };

    return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="bg-white shadow-lg hover:shadow-2xl w-[400px] h-[350px] rounded-md flex flex-col items-center gap-6 p-6">
                <p className="text-[30px] font-sans font-extrabold text-black">{isSignUp ? "Sign Up" : "Sign In"}</p>
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your mail id" className="border-[1px] border-gray-500 h-[42px] w-[326px] rounded-lg text-[14px] font-roboto text-gray-600 p-2"></input>
                    <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="border-[1px] border-gray-500 h-[42px] w-[326px] rounded-lg text-[14px] font-roboto text-gray-600 p-2"></input>
                    <button onClick={() => router.push("/")} type="submit" className="bg-green-600 w-[100px] h-[42px] rounded-md text-[14px] font-roboto">
                        Submit
                    </button>
                </form>
                <p className="text-[14px] font-roboto font-medium text-black">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}<span className="text-green-600" onClick={() => setIsSignUp((prev) => !prev)}>{isSignUp ? "Sign in" : "Sign up"}</span> </p>

            </div>
        </div>
    )
}