"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";

interface Notice {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInstructor, setIsInstructor] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [formData, setFormData] = useState({ title: "", content: "" });

    useEffect(() => {
        fetchNotices();
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Check specific email or role
            if (user.email === 'aiswit100@gmail.com') {
                setIsInstructor(true);
            } else {
                // Optional: Check DB role if needed
                const { data } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (data?.role === 'instructor') setIsInstructor(true);
            }
        }
    };

    const fetchNotices = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching notices:", error);
        else setNotices(data || []);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        try {
            if (editingNotice) {
                // Update
                const { error } = await supabase
                    .from('notices')
                    .update({
                        title: formData.title,
                        content: formData.content
                    })
                    .eq('id', editingNotice.id);

                if (error) throw error;
                alert("공지사항이 수정되었습니다.");
            } else {
                // Create
                const { error } = await supabase
                    .from('notices')
                    .insert([{
                        title: formData.title,
                        content: formData.content
                    }]);

                if (error) throw error;
                alert("공지사항이 등록되었습니다.");
            }

            closeModal();
            fetchNotices();
        } catch (error: any) {
            console.error("Error saving notice:", error);
            alert("저장 실패: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 이 공지사항을 삭제하시겠습니까?")) return;

        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            alert("삭제되었습니다.");
            fetchNotices();
        }
    };

    const openCreateModal = () => {
        setEditingNotice(null);
        setFormData({ title: "", content: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (notice: Notice) => {
        setEditingNotice(notice);
        setFormData({ title: notice.title, content: notice.content });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingNotice(null);
        setFormData({ title: "", content: "" });
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">공지사항</h1>
                    <p className="text-gray-500 mt-2">중요한 소식과 업데이트를 확인하세요.</p>
                </div>
                {isInstructor && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        글쓰기
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : notices.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                    등록된 공지사항이 없습니다.
                </div>
            ) : (
                <div className="space-y-4">
                    {notices.map((notice) => (
                        <div key={notice.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{notice.title}</h3>
                                    <span className="text-sm text-gray-400">
                                        {new Date(notice.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                {isInstructor && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(notice)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(notice.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                                {notice.content}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingNotice ? "공지사항 수정" : "새 공지사항 작성"}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="제목을 입력하세요"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-40 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                    placeholder="내용을 입력하세요"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    {editingNotice ? "수정하기" : "등록하기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
