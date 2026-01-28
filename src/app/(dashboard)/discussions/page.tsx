"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, MessageCircle, User as UserIcon } from "lucide-react";
import CommentSection from "@/components/comments/CommentSection";

interface Discussion {
    id: string;
    title: string;
    content: string;
    created_at: string;
    author_id: string;
    author_email?: string;
    author_name?: string;
}

export default function DiscussionsPage() {
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isInstructor, setIsInstructor] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", content: "" });

    useEffect(() => {
        fetchDiscussions();
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUser(session.user);
            // Check instructor role
            if (session.user.email === 'aiswit100@gmail.com') {
                setIsInstructor(true);
            } else {
                const { data } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                if (data?.role === 'instructor') setIsInstructor(true);
            }
        }
    };

    const fetchDiscussions = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('discussions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching discussions:", error);
        else setDiscussions(data || []);
        setIsLoading(false);
    };

    const getAuthorName = () => {
        return currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '사용자';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return alert("로그인이 필요합니다.");
        if (!formData.title.trim() || !formData.content.trim()) return;

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('discussions')
                    .update({
                        title: formData.title,
                        content: formData.content
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert("수정되었습니다.");
            } else {
                // Create
                const { error } = await supabase
                    .from('discussions')
                    .insert([{
                        title: formData.title,
                        content: formData.content,
                        author_id: currentUser.id,
                        author_email: currentUser.email,
                        author_name: getAuthorName()
                    }]);

                if (error) throw error;
                alert("등록되었습니다.");
            }

            closeModal();
            fetchDiscussions();
        } catch (error: any) {
            console.error("Error saving discussion:", error);
            alert("저장 실패: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase
            .from('discussions')
            .delete()
            .eq('id', id);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            fetchDiscussions();
        }
    };

    const openCreateModal = () => {
        if (!currentUser) return alert("로그인이 필요합니다.");
        setEditingId(null);
        setFormData({ title: "", content: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (item: Discussion) => {
        setEditingId(item.id);
        setFormData({ title: item.title, content: item.content });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: "", content: "" });
    };

    const canManage = (item: Discussion) => {
        if (!currentUser) return false;
        return currentUser.id === item.author_id || isInstructor;
    };

    const [viewingDiscussion, setViewingDiscussion] = useState<Discussion | null>(null);

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex-none pt-8 px-4 md:px-8 pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">자유 게시판</h1>
                        <p className="text-gray-500 mt-2">(질문 · 토론) 자유롭게 질문하고 지식을 공유해보세요.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        게시물 등록
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar">
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
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : discussions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
                        <MessageCircle className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                        등록된 글이 없습니다. 첫 번째 질문을 남겨보세요!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {discussions.map((item) => (
                            <div key={item.id} className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-4">
                                        <span className="text-xs px-2 py-1 rounded font-bold shrink-0 bg-green-100 text-green-700 mt-0.5">
                                            질문/토론
                                        </span>
                                        <div>
                                            <h3
                                                className="text-lg font-bold text-gray-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                                                onClick={() => setViewingDiscussion(item)}
                                            >
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className="font-semibold text-gray-800">
                                                    {item.author_name || item.author_email?.split('@')[0] || '익명'}
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {canManage(item) && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap line-clamp-3 mb-4">
                                    {item.content}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setViewingDiscussion(item)}
                                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        댓글 확인 및 작성
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingId ? "글 수정" : "새 글 작성"}
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
                                    placeholder="궁금한 내용을 요약해주세요"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-40 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                    placeholder="자세한 내용을 적어주세요"
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
                                    {editingId ? "수정하기" : "등록하기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {viewingDiscussion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        <div className="flex justify-between items-start p-6 border-b shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{viewingDiscussion.title}</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className="font-semibold text-gray-800">
                                        {viewingDiscussion.author_name || viewingDiscussion.author_email?.split('@')[0] || '익명'}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(viewingDiscussion.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <button onClick={() => setViewingDiscussion(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="prose prose-blue max-w-none text-gray-800 whitespace-pre-wrap mb-8">
                                {viewingDiscussion.content}
                            </div>

                            <CommentSection targetId={viewingDiscussion.id} targetType="discussion" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
