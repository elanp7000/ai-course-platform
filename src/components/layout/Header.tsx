"use client";

import { Bell, Menu, User, LogOut, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { User as SupabaseUser } from "@supabase/supabase-js";

export function Header() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('name, role')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserInfo({
                        name: profile.name || session.user.email?.split('@')[0] || 'User',
                        role: profile.role || 'student'
                    });
                }
            }
        };

        fetchUser();

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            router.refresh();
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsMenuOpen(false);
        router.refresh();
        router.push("/");
    };

    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-10">
            <button className="md:hidden p-2 -ml-2 text-gray-600">
                <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 ml-auto">
                {/* User Badge Replaced Bell Icon */}
                {userInfo && (
                    <span className="rounded-full bg-blue-500 text-white px-3 py-0.5 text-xs font-medium shadow-sm">
                        {userInfo.role === 'instructor' ? '강사' : userInfo.name}
                    </span>
                )}

                {user ? (
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-200 transition-colors"
                        >
                            <User className="w-5 h-5" />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-3 border-b">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                        <LogIn className="w-4 h-4" />
                        로그인
                    </Link>
                )}
            </div>
        </header>
    );
}
