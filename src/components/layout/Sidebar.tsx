"use client";

import Link from "next/link";
import { Bot, Home, List, MessageCircle, User, LucideIcon, Bell, MonitorCloud, Library } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export function Sidebar() {
    const [userInfo, setUserInfo] = useState<{ name: string; role: string; status: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch public profile for role, name, and status
                const { data: profile } = await supabase
                    .from('users')
                    .select('name, role, status')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUserInfo({
                        name: profile.name || session.user.email?.split('@')[0] || 'User',
                        role: profile.role || 'student',
                        status: profile.status || 'approved' // Default to approved if null (for legacy)
                    });
                }
            }
        };

        fetchUser();
    }, []);

    const isInstructor = userInfo?.role === 'instructor';
    const isPending = userInfo?.status === 'pending';

    return (
        <aside className="w-64 bg-white border-r h-full flex flex-col hidden md:flex">
            <div className="h-16 border-b flex items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Bot className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-xl text-gray-800">
                        AI Course
                    </span>
                </Link>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {isPending ? (
                    <div className="p-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
                        승인 대기 중입니다.
                    </div>
                ) : (
                    <>
                        <NavItem href="/dashboard" icon={Home} label="대시보드" />
                        <NavItem href="/notices" icon={List} label="공지사항" />
                        <NavItem href="/materials" icon={Library} label="학습 자료" />
                        <NavItem
                            href="/discussions"
                            icon={MessageCircle}
                            label="자유 게시판"
                            customClass="text-gray-600 hover:bg-green-50 hover:text-green-600 font-medium"
                        />
                        <NavItem
                            href="/portfolio"
                            icon={MonitorCloud}
                            label="실습 과제"
                            customClass="text-gray-600 hover:bg-green-50 hover:text-green-600 font-medium"
                        />
                        {userInfo && (
                            <NavItem
                                href="/portfolio?view=my"
                                icon={User}
                                label="나의 포트폴리오"
                                customClass="text-gray-600 hover:bg-orange-50 hover:text-orange-600 font-semibold"
                            />
                        )}
                        {isInstructor && (
                            <>
                                <div className="pt-4 pb-2">
                                    <div className="border-t my-2"></div>
                                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        관리자 메뉴
                                    </p>
                                </div>
                                <NavItem
                                    href="/admin/users"
                                    icon={User}
                                    label="회원 관리"
                                    customClass="text-purple-600 hover:bg-purple-50 hover:text-purple-700 font-semibold"
                                />
                            </>
                        )}
                    </>
                )}
            </nav>
        </aside>
    );
}

function NavItem({ href, icon: Icon, label, customClass }: { href: string; icon: LucideIcon; label: string; customClass?: string }) {
    return (
        <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${customClass || 'text-gray-600 hover:bg-gray-50 hover:text-blue-600 font-medium'}`}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </Link>
    );
}
