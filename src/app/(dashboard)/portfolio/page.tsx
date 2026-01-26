"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, Globe, User } from "lucide-react";

interface PortfolioItem {
    id: string;
    title: string;
    description: string;
    project_url: string;
    created_at: string;
    user_id: string;
}

export default function PortfolioPage() {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", description: "", project_url: "" });

    useEffect(() => {
        fetchPortfolios();
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUser(session.user);
        }
    };

    const fetchPortfolios = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error("Error fetching portfolios:", error);
        else setItems(data || []);
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return alert("로그인이 필요합니다.");
        if (!formData.title.trim()) return;

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('portfolios')
                    .update({
                        title: formData.title,
                        description: formData.description,
                        project_url: formData.project_url
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert("수정되었습니다.");
            } else {
                // Create
                const { error } = await supabase
                    .from('portfolios')
                    .insert([{
                        title: formData.title,
                        description: formData.description,
                        project_url: formData.project_url,
                        user_id: currentUser.id
                    }]);

                if (error) throw error;
                alert("등록되었습니다.");
            }

            closeModal();
            fetchPortfolios();
        } catch (error: any) {
            console.error("Error saving portfolio:", error);
            alert("저장 실패: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase
            .from('portfolios')
            .delete()
            .eq('id', id);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            fetchPortfolios();
        }
    };

    const openCreateModal = () => {
        if (!currentUser) return alert("로그인이 필요합니다.");
        setEditingId(null);
        setFormData({ title: "", description: "", project_url: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (item: PortfolioItem) => {
        setEditingId(item.id);
        setFormData({ title: item.title, description: item.description, project_url: item.project_url });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ title: "", description: "", project_url: "" });
    };

    const isOwner = (item: PortfolioItem) => {
        return currentUser && currentUser.id === item.user_id;
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">내 포트폴리오</h1>
                    <p className="text-gray-500 mt-2">학습한 결과물을 공유하고 서로 피드백을 주고받으세요.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-5 h-5" />
                    프로젝트 추가
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
                    <User className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                    등록된 프로젝트가 없습니다. 나의 포트폴리오를 만들어보세요!
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white rounded-xl border hover:shadow-lg transition-all group flex flex-col h-full">
                            {/* Placeholder Image or Preview could go here */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{item.title}</h3>
                                    {isOwner(item) && (
                                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-3">
                                    {item.description || "설명이 없습니다."}
                                </p>

                                <div className="pt-4 border-t flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                    {item.project_url && (
                                        <a
                                            href={item.project_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                                        >
                                            <Globe className="w-4 h-4" />
                                            보러가기
                                        </a>
                                    )}
                                </div>
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
                                {editingId ? "프로젝트 수정" : "새 프로젝트 추가"}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="프로젝트명을 입력하세요"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">소개 / 설명</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                    placeholder="어떤 프로젝트인지 설명해주세요"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 링크 (URL)</label>
                                <input
                                    type="url"
                                    value={formData.project_url}
                                    onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    placeholder="https://..."
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
        </div>
    );
}
