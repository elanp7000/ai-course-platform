"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, Globe, User } from "lucide-react";

interface PortfolioItem {
    id: string;
    title: string;
    description: string;
    project_url: string;
    created_at: string;
    user_id: string;
    author_name?: string;
}

export default function PortfolioPage() {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", description: "", project_url: "" });

    // Detail Modal State
    const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

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

    const extractFirstImage = (markdown: string) => {
        const match = markdown.match(/!\[.*?\]\((.*?)\)/);
        return match ? match[1] : null;
    };

    const getAuthorName = () => {
        // User requested Login ID (email prefix) as the primary nickname
        return currentUser?.email?.split('@')[0] || currentUser?.user_metadata?.full_name || '사용자';
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('portfolio_uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('portfolio_uploads')
                .getPublicUrl(filePath);

            const markdown = type === 'image'
                ? `\n![${file.name}](${publicUrl})\n`
                : `\n[동영상 보기](${publicUrl})\n`;

            setFormData(prev => ({
                ...prev,
                description: prev.description + markdown
            }));

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('업로드 실패: ' + error.message);
        } finally {
            setIsUploading(false);
            if (event.target) event.target.value = '';
        }
    };

    const handleLinkInsert = () => {
        const url = prompt("링크 주소(URL)를 입력해주세요:");
        if (!url) return;

        const text = prompt("링크 텍스트를 입력해주세요 (선택사항):") || "링크";
        const markdown = `\n[${text}](${url})\n`;

        setFormData(prev => ({
            ...prev,
            description: prev.description + markdown
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return alert("로그인이 필요합니다.");
        if (!formData.description.trim()) return;

        // Auto-generate title from description
        const generatedTitle = formData.description.length > 20
            ? formData.description.substring(0, 20) + "..."
            : formData.description;

        const authorName = getAuthorName();

        try {
            if (editingId) {
                // Update
                const { error } = await supabase
                    .from('portfolios')
                    .update({
                        title: generatedTitle,
                        description: formData.description,
                        project_url: formData.project_url,
                        author_name: authorName
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert("수정되었습니다.");
            } else {
                // Create
                const { error } = await supabase
                    .from('portfolios')
                    .insert([{
                        title: generatedTitle,
                        description: formData.description,
                        project_url: formData.project_url,
                        user_id: currentUser.id,
                        author_name: authorName
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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent card click
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

    const openEditModal = (e: React.MouseEvent, item: PortfolioItem) => {
        e.stopPropagation(); // Prevent card click
        setEditingId(item.id);
        setFormData({
            title: item.title,
            description: item.description,
            project_url: item.project_url
        });
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
                    <h1 className="text-3xl font-bold text-gray-900">실습 과제</h1>
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
                    등록된 프로젝트가 없습니다. + 프로젝트 추가를 눌러 만들어보세요!
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => {
                        const firstImage = extractFirstImage(item.description);
                        return (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="bg-white rounded-xl border hover:shadow-lg transition-all group flex flex-col h-full cursor-pointer overflow-hidden"
                            >
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-blue-100 p-1.5 rounded-full">
                                                <User className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {item.author_name || "익명 사용자"}
                                            </h3>
                                        </div>
                                        {isOwner(item) && (
                                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => openEditModal(e, item)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, item.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Preview or Text Snippet */}
                                    <div className="flex-1 mb-4 h-48 bg-gray-50 rounded-lg overflow-hidden relative">
                                        {firstImage ? (
                                            <img
                                                src={firstImage}
                                                alt="Project Preview"
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full p-4 overflow-hidden text-sm text-gray-500 prose-sm prose-p:my-0">
                                                <div className="line-clamp-[8] break-words whitespace-pre-wrap">
                                                    {item.description}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Modal */}
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
                            {/* User Info */}
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">작성자</p>
                                    <p className="font-medium text-gray-900">
                                        {getAuthorName()}
                                    </p>
                                </div>
                            </div>

                            {/* Content Input */}
                            <div>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full h-40 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-base"
                                    placeholder="프로젝트에 대해 설명해주세요..."
                                    required
                                />

                                {/* Media Actions */}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                                        title="사진 추가"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {isUploading && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => videoInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                                        title="동영상 추가"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        {isUploading && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLinkInsert}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="링크 추가"
                                    >
                                        <Globe className="w-5 h-5" />
                                    </button>

                                    {/* Upload Inputs */}
                                    <input
                                        type="file"
                                        ref={imageInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'image')}
                                    />
                                    <input
                                        type="file"
                                        ref={videoInputRef}
                                        className="hidden"
                                        accept="video/*"
                                        onChange={(e) => handleFileUpload(e, 'video')}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                    disabled={isUploading}
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                    disabled={isUploading}
                                >
                                    {isUploading ? "업로드 중..." : (editingId ? "수정하기" : "등록하기")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div
                        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {selectedItem.author_name || "익명 사용자"}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {new Date(selectedItem.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="prose prose-blue max-w-none prose-img:rounded-xl prose-img:w-full prose-headings:font-bold prose-a:text-blue-600">
                                <ReactMarkdown>
                                    {selectedItem.description}
                                </ReactMarkdown>
                            </div>

                            {/* External Link if exists */}
                            {selectedItem.project_url && (
                                <div className="mt-8 pt-4 border-t">
                                    <a
                                        href={selectedItem.project_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                    >
                                        <Globe className="w-5 h-5" />
                                        프로젝트 페이지 방문하기
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions (Only for owner) */}
                        {isOwner(selectedItem) && (
                            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                                <button
                                    onClick={(e) => {
                                        setSelectedItem(null);
                                        openEditModal(e, selectedItem);
                                    }}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium flex items-center gap-2"
                                >
                                    <Pencil className="w-4 h-4" />
                                    수정
                                </button>
                                <button
                                    onClick={(e) => {
                                        setSelectedItem(null);
                                        handleDelete(e, selectedItem.id);
                                    }}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    삭제
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
