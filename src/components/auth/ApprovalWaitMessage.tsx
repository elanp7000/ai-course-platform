"use client";

import { Clock, LogOut } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function ApprovalWaitMessage() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-full max-w-md mx-auto">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                가입 승인 대기 중
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
                강사님의 승인을 기다리고 있습니다.<br />
                승인이 완료되면 모든 학습 자료를 열람하실 수 있습니다.
            </p>
            <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
                <LogOut className="w-4 h-4" />
                로그아웃
            </button>
        </div>
    );
}
