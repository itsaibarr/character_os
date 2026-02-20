import { auth } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeroSection } from "@/components/home/HeroSection";

export default async function Home() {
  const reqHeaders = await headers();
  
  // Check Supabase
  const supabase = await createClient();
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Check Better Auth
  const betterSession = await auth.api.getSession({
    headers: reqHeaders
  });

  if (supabaseUser || betterSession) {
    redirect("/dashboard");
  }
  return (
    <HeroSection />
  );
}
