"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { ApprovalWaitMessage } from "@/components/auth/ApprovalWaitMessage";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [status, setStatus] = useState<'loading' | 'pending' | 'approved' | 'rejected'>('loading');

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data } = await supabase
                    .from('users')
                    .select('status')
                    .eq('id', session.user.id)
                    .single();

                setStatus(data?.status || 'approved');
            } else {
                setStatus('approved'); // Let middleware or protected routes handle unauthenticated
            }
        };
        checkStatus();
    }, []);

    if (status === 'loading') {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {status === 'pending' ? (
                        <div className="h-full flex items-center justify-center">
                            <ApprovalWaitMessage />
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}
