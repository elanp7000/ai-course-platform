"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

interface Notice {
    id: string;
    title: string;
    content: string;
    created_at: string;
    images?: string[];
}

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInstructor, setIsInstructor] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [formData, setFormData] = useState({ title: "", content: "" });
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [uploading, setUploading] = useState(false);
    const [existingImages, setExistingImages] = useState<string[]>([]); // For editing

    useEffect(() => {
        fetchNotices();
        checkUserRole();
    }, []);

    const checkUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data?.role === 'instructor') setIsInstructor(true);
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

    const uploadImages = async (files: FileList) => {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('notice_images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('notice_images')
                .getPublicUrl(filePath);

            urls.push(publicUrl);
        }
        return urls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        setUploading(true);
        try {
            let imageUrls: string[] = existingImages;

            if (selectedFiles && selectedFiles.length > 0) {
                const newUrls = await uploadImages(selectedFiles);
                imageUrls = [...imageUrls, ...newUrls];
            }

            if (editingNotice) {
                // Update
                const { error } = await supabase
                    .from('notices')
                    .update({
                        title: formData.title,
                        content: formData.content,
                        images: imageUrls
                    })
                    .eq('id', editingNotice.id);

                if (error) throw error;
                alert("수정되었습니다.");
            } else {
                // Create
                const { error } = await supabase
                    .from('notices')
                    .insert([{
                        title: formData.title,
                        content: formData.content,
                        images: imageUrls
                    }]);

                if (error) throw error;
                alert("등록되었습니다.");
            }

            closeModal();
            fetchNotices();
        } catch (error: any) {
            console.error("Error saving notice:", error);
            alert("저장 실패: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            fetchNotices();
        }
    };

    const openCreateModal = () => {
        setEditingNotice(null);
        setFormData({ title: "", content: "" });
        setSelectedFiles(null);
        setExistingImages([]);
        setIsModalOpen(true);
    };

    const openEditModal = (notice: Notice) => {
        setEditingNotice(notice);
        setFormData({ title: notice.title, content: notice.content });
        setSelectedFiles(null);
        setExistingImages(notice.images || []);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingNotice(null);
        setFormData({ title: "", content: "" });
        setSelectedFiles(null);
        setExistingImages([]);
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
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
                <div className="space-y-6">
                    {notices.map((notice) => (
                        <NoticeItem
                            key={notice.id}
                            notice={notice}
                            isInstructor={isInstructor}
                            onEdit={() => openEditModal(notice)}
                            onDelete={() => handleDelete(notice.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
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
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="제목을 입력하세요"
                                    required
                                />
                            </div>

                            {/* Content Area with Integrated Image Upload Toolbar */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">공지 내용</label>

                                    {/* Image Upload Button */}
                                    <div className="flex items-center gap-2">
                                        <label
                                            htmlFor="image-upload"
                                            className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-md transition-all text-sm text-gray-600"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                            <span>사진 첨부</span>
                                            <input
                                                id="image-upload"
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setSelectedFiles(e.target.files);
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Selected Files & Existing Images Preview - Shows above text */}
                                {(selectedFiles || existingImages.length > 0) && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {/* Existing Images */}
                                        {existingImages.map((src, idx) => (
                                            <div key={`exist-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border group">
                                                <img src={src} alt={`existing-${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(idx)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* New Files Preview */}
                                        {selectedFiles && Array.from(selectedFiles).map((file, idx) => (
                                            <div key={`new-${idx}`} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border group">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="preview"
                                                    className="w-full h-full object-cover"
                                                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                                />
                                                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1 shadow-sm">
                                                    <div className="w-3 h-3 rounded-full bg-white" /> {/* Indicator */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-64 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-base leading-relaxed"
                                    placeholder="공지사항 내용을 입력하세요..."
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    {uploading ? "업로드 중..." : (editingNotice ? "수정하기" : "등록하기")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function NoticeItem({ notice, isInstructor, onEdit, onDelete }: { notice: Notice, isInstructor: boolean, onEdit: () => void, onDelete: () => void }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const hasImages = notice.images && notice.images.length > 0;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notice.images) return;
        setCurrentImageIndex((prev) => (prev + 1) % notice.images!.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!notice.images) return;
        setCurrentImageIndex((prev) => (prev - 1 + notice.images!.length) % notice.images!.length);
    };

    return (
        <div
            className={`bg-white rounded-xl border transition-all overflow-hidden ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}
        >
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-6 cursor-pointer flex justify-between items-start group"
            >
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-xl font-bold transition-colors ${isExpanded ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'}`}>
                            {notice.title}
                        </h3>
                        {hasImages && !isExpanded && (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                    <span className="text-sm text-gray-400">
                        {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Toggle Icon */}
                    <div className={`p-2 rounded-full bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors`}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>

                    {/* Instructor Actions */}
                    {isInstructor && (
                        <div className="flex gap-1 border-l pl-4" onClick={(e) => e.stopPropagation()}>
                            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Image Carousel */}
                    {hasImages && (
                        <div className="relative -mx-6 mb-6 group/image bg-gray-50 border-y border-gray-100">
                            <img
                                src={notice.images![currentImageIndex]}
                                alt={`Notice image ${currentImageIndex + 1}`}
                                className="w-full h-auto block"
                            />

                            {/* Navigation Buttons (only if > 1 image) */}
                            {notice.images!.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors opacity-0 group-hover/image:opacity-100"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors opacity-0 group-hover/image:opacity-100"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/30 px-3 py-1 rounded-full text-white text-xs backdrop-blur-sm">
                                        {currentImageIndex + 1} / {notice.images!.length}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {notice.content}
                    </div>
                </div>
            )}
        </div>
    );
}
