"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full h-40 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="내용을 입력하세요"
                                    required
                                />
                            </div>

                            {/* Image Upload Area */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">이미지 첨부</label>

                                {/* Upload Dropzone */}
                                <div className="relative group">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                // Append new files to existing selection if possible, or just replace. 
                                                // For simplicity in standard inputs, we usually replace, but let's try to simulate 'adding' if we want robust UX, 
                                                // but standard file input replacement is safer for now unless we manage a custom array of Files.
                                                // Let's stick to standard behavior but style it better.
                                                setSelectedFiles(e.target.files);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-blue-50 group-hover:border-blue-400 transition-all text-gray-400 group-hover:text-blue-500">
                                        <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                        <p className="font-semibold text-sm">
                                            클릭하여 이미지 업로드
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            또는 파일을 여기로 드래그하세요
                                        </p>
                                    </div>
                                </div>

                                {/* Selected Files & Existing Images Preview */}
                                {(selectedFiles || existingImages.length > 0) && (
                                    <div className="mt-4 grid grid-cols-4 gap-2">
                                        {/* Existing Images */}
                                        {existingImages.map((src, idx) => (
                                            <div key={`exist-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border group">
                                                <img src={src} alt={`existing-${idx}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 opacity-100 transition-all shadow-sm"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1 py-0.5 text-center truncate">
                                                    기존 이미지
                                                </div>
                                            </div>
                                        ))}

                                        {/* New Files Preview */}
                                        {selectedFiles && Array.from(selectedFiles).map((file, idx) => (
                                            <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
                                                {/* We can create object URL for preview */}
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt="preview"
                                                    className="w-full h-full object-cover opacity-80"
                                                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                                />
                                                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1 shadow-sm">
                                                    <Plus className="w-3 h-3 rotate-45" /> {/* Use as fake remove icon or just indicator */}
                                                </div>
                                                <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[10px] px-1 py-0.5 text-center truncate">
                                                    새 파일
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
    const hasImages = notice.images && notice.images.length > 0;

    const nextImage = () => {
        if (!notice.images) return;
        setCurrentImageIndex((prev) => (prev + 1) % notice.images!.length);
    };

    const prevImage = () => {
        if (!notice.images) return;
        setCurrentImageIndex((prev) => (prev - 1 + notice.images!.length) % notice.images!.length);
    };

    return (
        <div className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{notice.title}</h3>
                    <span className="text-sm text-gray-400">
                        {new Date(notice.created_at).toLocaleDateString()}
                    </span>
                </div>
                {isInstructor && (
                    <div className="flex gap-2">
                        <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

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

            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed mt-4">
                {notice.content}
            </div>
        </div>
    );
}
