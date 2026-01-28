"use client";

import Link from "next/link";
import { BookOpen, Home, List, MessageCircle, Settings, User, LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export function Sidebar() {
    const [userInfo, setUserInfo] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch public profile for role and name
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
    }, []);

    const getLogoText = () => {
        if (!userInfo) return "AI Course";
        if (userInfo.role === 'instructor') return "AI Course 강사";
        return `AI Course ${userInfo.name}`;
    };

    const isInstructor = userInfo?.role === 'instructor';

    return (
        <aside className="w-64 bg-white border-r h-full flex flex-col hidden md:flex">
            <div className="h-[88px] border-b flex flex-col items-center justify-center gap-3">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-xl text-gray-800">
                        AI Course
                    </span>
                </Link>
                {userInfo && (
                    <span className="rounded-full bg-blue-500 text-white px-3 py-0.5 text-xs font-medium shadow-sm">
                        {userInfo.role === 'instructor' ? '강사' : userInfo.name}
                    </span>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <NavItem href="/dashboard" icon={Home} label="대시보드" />
                <NavItem href="/notices" icon={List} label="공지사항" />
                <NavItem href="/discussions" icon={MessageCircle} label="자유 게시판" />
                <NavItem href="/portfolio" icon={User} label="실습 과제" />
                {userInfo && (
                    <NavItem href="/portfolio?view=my" icon={User} label="나의 포트폴리오" customClass="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold" />
                )}
            </nav>

            <div className="p-4 border-t">
                <NavItem href="/settings" icon={Settings} label="설정" />
            </div>
        </aside>
    );
}

function NavItem({ href, icon: Icon, label, customClass }: { href: string; icon: LucideIcon; label: string; customClass?: string }) {
    return (
        <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${customClass || 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </Link>
    );
}
