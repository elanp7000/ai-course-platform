"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Check, X, Shield, User, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type UserProfile = {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string; // 'pending' | 'approved' | 'rejected'
    created_at: string;
};

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setUsers(data as UserProfile[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateStatus = async (userId: string, newStatus: 'approved' | 'rejected') => {
        const { error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);

        if (!error) {
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } else {
            alert("상태 업데이트에 실패했습니다.");
        }
    };

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true;
        return user.status === filter;
    });

    const pendingCount = users.filter(u => u.status === 'pending').length;

    if (loading) return <div className="p-8">로딩 중...</div>;

    return (
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto">
            <div className="flex-none pt-8 px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-8 h-8 text-blue-600" />
                            회원 관리
                        </h1>
                        <p className="text-gray-500 mt-1">
                            전체 사용자 {users.length}명 | 승인 대기 {pendingCount}명
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'all', label: '전체' },
                        { key: 'pending', label: '승인 대기' },
                        { key: 'approved', label: '승인됨' },
                        { key: 'rejected', label: '거절됨' }
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                <style jsx>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background-color: #e5e7eb;
                        border-radius: 20px;
                    }
                `}</style>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">사용자 정보</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">역할</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">가입일</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600">상태</th>
                                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        해당하는 사용자가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name || "이름 없음"}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'instructor'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {user.role === 'instructor' ? '강사' : '학생'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {format(new Date(user.created_at), 'yyyy년 M월 d일', { locale: ko })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={user.status || 'approved'} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {user.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleUpdateStatus(user.id, 'approved')}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="승인"
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(user.id, 'rejected')}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="거절"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                            {user.status !== 'pending' && (
                                                <div className="inline-block text-xs text-gray-400">
                                                    처리됨
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'pending':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    승인 대기
                </span>
            );
        case 'approved':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    승인됨
                </span>
            );
        case 'rejected':
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    거절됨
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {status}
                </span>
            );
    }
}
