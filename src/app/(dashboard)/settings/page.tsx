"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { User, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [nickname, setNickname] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            // Pre-fill nickname from metadata if exists
            setNickname(session.user.user_metadata?.full_name || "");
        }
        setIsLoading(false);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: nickname }
            });

            if (error) throw error;

            setMessage({ type: 'success', text: "프로필이 성공적으로 업데이트되었습니다." });
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setMessage({ type: 'error', text: "업데이트 실패: " + error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <p className="text-gray-500">로그인이 필요한 페이지입니다.</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">설정</h1>
            <p className="text-gray-500 mb-8">계정 정보를 관리하세요.</p>

            <div className="bg-white rounded-xl border p-8 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    프로필 설정
                </h2>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            이메일
                        </label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
                    </div>

                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                            닉네임
                        </label>
                        <input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                            placeholder="사용하실 닉네임을 입력해주세요"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            실습 과제 및 토론 게시판에서 이 이름으로 활동하게 됩니다.
                        </p>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? "저장 중..." : "변경사항 저장"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
