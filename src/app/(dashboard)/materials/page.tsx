"use client";

import { useEffect, useState, useRef } from "react";
import { Folder, FileText, Download, Search, Plus, X, PlayCircle, Image as ImageIcon, FileCode, BookOpen, Link as LinkIcon, Trash2, Edit2, CheckCircle, Bot, Globe, Bold, Type, Palette, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";

type Material = {
    id: string;
    week_id: string;
    title: string;
    type: 'video' | 'text' | 'pdf' | 'link' | 'image' | 'html' | 'ai_tool';
    content_url?: string;
    description?: string;
    created_at: string;
    sort_order: number;
    weeks?: { title: string, week_number: number }; // Joined data
    is_visible?: boolean;
};

type Week = {
    id: string;
    title: string;
    week_number: number;
};

export default function MaterialsPage() {
    // Data State
    const [materials, setMaterials] = useState<Material[]>([]);
    const [weeks, setWeeks] = useState<Week[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Filter/Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");

    // UI State
    const [isAdding, setIsAdding] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // References for file inputs
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const htmlInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // For main content file

    // Form State
    const [formData, setFormData] = useState({
        week_id: "",
        title: "",
        type: "link" as Material['type'],
        content_url: "",
        description: "", // Now supports Markdown
        is_visible: true
    });
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();
            setUserRole(userData?.role || 'student');
        }

        // Fetch Weeks for dropdown
        const { data: weeksData } = await supabase
            .from('weeks')
            .select('id, title, week_number')
            .order('week_number');
        if (weeksData) setWeeks(weeksData);

        // Fetch Materials with Week info
        const { data: materialsData, error } = await supabase
            .from('materials')
            .select(`
                *,
                weeks (
                    title,
                    week_number
                )
            `)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (materialsData) {
            setMaterials(materialsData as unknown as Material[]);
        }

        setLoading(false);
    };

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('lecture_materials')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('lecture_materials')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    // New: Handle Description Uploads (Images/Videos/HTML within description)
    const handleDescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'html') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const url = await uploadFile(file);

            const markdown = type === 'image'
                ? `\n![${file.name}](${url})\n`
                : type === 'video'
                    ? `\n[동영상 보기](${url})\n`
                    : `\n[HTML 파일 보기](${url})\n`;

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

    const handleMaterialAccess = async (e: React.MouseEvent, material: Material) => {
        e.stopPropagation();
        if (!material.content_url) return;

        // For files that should be downloaded (PDF, HTML, Image)
        if (['pdf', 'html', 'image'].includes(material.type)) {
            try {
                const response = await fetch(material.content_url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = material.title + (material.type === 'html' ? '.html' : material.type === 'pdf' ? '.pdf' : '.jpg');
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Download failed:', error);
                alert('다운로드 중 오류가 발생했습니다.');
                window.open(material.content_url, '_blank');
            }
        } else {
            // For Links, Videos, etc. -> Open in new tab
            window.open(material.content_url, '_blank');
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

    const insertText = (before: string, after: string = "") => {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

        setFormData(prev => ({ ...prev, description: newText }));

        // Restore focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            let finalContentUrl = formData.content_url;

            if (file) {
                finalContentUrl = await uploadFile(file);
            }

            if (editingMaterial) {
                const { error } = await supabase.from('materials').update({
                    week_id: formData.week_id,
                    title: formData.title,
                    type: formData.type,
                    description: formData.description,
                    content_url: finalContentUrl,
                    is_visible: formData.is_visible
                }).eq('id', editingMaterial.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from('materials').insert({
                    week_id: formData.week_id,
                    title: formData.title,
                    type: formData.type,
                    description: formData.description,
                    content_url: finalContentUrl,
                    is_visible: formData.is_visible
                });

                if (error) throw error;
            }

            // Refresh data
            fetchData();
            handleCloseModal();
            alert(editingMaterial ? "수정되었습니다." : "등록되었습니다.");
        } catch (error: any) {
            console.error("Error:", error);
            alert("오류가 발생했습니다: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditClick = (item: Material, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingMaterial(item);
        setFormData({
            week_id: item.week_id,
            title: item.title,
            type: item.type,
            content_url: item.content_url || "",
            description: item.description || "",
            is_visible: item.is_visible ?? true
        });
        setFile(null);
        setIsAdding(true);
    };

    const handleMoveMaterial = async (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFiltering) {
            alert("순서 변경은 '전체' 보기 상태에서만 가능합니다 (검색/필터 해제 필요).");
            return;
        }

        const currentIndex = filteredMaterials.findIndex(m => m.id === id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= filteredMaterials.length) return;

        // Create a new array and normalize sort_order for ALL items to ensure consistency
        const newMaterials = [...filteredMaterials].map((m, idx) => ({ ...m, sort_order: idx }));

        // Swap in the array
        const temp = newMaterials[currentIndex];
        newMaterials[currentIndex] = newMaterials[targetIndex];
        newMaterials[targetIndex] = temp;

        // Re-assign sort_order based on new positions
        const contentUpdates = newMaterials.map((m, idx) => {
            m.sort_order = idx;
            return { id: m.id, sort_order: idx };
        });

        setMaterials(newMaterials); // Optimistic Update

        // Batch Update DB
        try {
            const updates = contentUpdates.map(u =>
                supabase.from('materials').update({ sort_order: u.sort_order }).eq('id', u.id)
            );
            await Promise.all(updates);
        } catch (error) {
            console.error("Reorder failed", error);
            alert("순서 저장 중 오류가 발생했습니다.");
            fetchData(); // Revert
        }
    };

    const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("정말 이 자료를 삭제하시겠습니까?")) return;
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) alert("삭제 실패: " + error.message);
        else fetchData();
    };

    const handleCloseModal = () => {
        setIsAdding(false);
        setEditingMaterial(null);
        setFormData({ week_id: "", title: "", type: "link", content_url: "", description: "", is_visible: true });
        setFile(null);
    };

    // Filter Logic
    const isFiltering = searchTerm !== "" || selectedType !== "all";
    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.weeks?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || m.type === selectedType;
        const matchesVisibility = isInstructor || m.is_visible !== false; // Hide hidden items from students
        return matchesSearch && matchesType && matchesVisibility;
    });

    const isInstructor = userRole === 'instructor';

    const MarkdownComponents = {
        a: ({ node, ...props }: any) => {
            const { href, children } = props;
            if (href?.match(/\.(mp4|webm|ogg|mov)$/i)) {
                return (
                    <video controls className="w-full rounded-xl my-4 max-h-[500px] bg-black" preload="metadata">
                        <source src={href} />
                        동영상을 재생할 수 없습니다.
                    </video>
                );
            }
            return (
                <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                    <LinkIcon className="w-4 h-4 inline" />
                    {children}
                </a>
            );
        },
        img: ({ node, ...props }: any) => (
            <img
                {...props}
                className="rounded-xl w-full h-auto my-4 shadow-sm"
                loading="lazy"
            />
        )
    };

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto w-full">
            {/* Header & Filters - Fixed */}
            <div className="flex-none pt-8 px-4 md:px-8 pb-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">학습 자료</h1>
                        <p className="text-gray-500 mt-2">전체 커리큘럼의 학습 자료를 모아보고 검색할 수 있습니다.</p>
                    </div>
                    {isInstructor && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 font-bold shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            자료 등록하기
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="제목 또는 주차명으로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar">
                            <style jsx>{`
                                .custom-scrollbar::-webkit-scrollbar {
                                    height: 4px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background-color: #e5e7eb;
                                    border-radius: 20px;
                                }
                            `}</style>
                            {[
                                { id: 'all', label: '전체' },
                                { id: 'video', label: 'Video' },
                                { id: 'pdf', label: 'PDF' },
                                { id: 'link', label: 'Link' },
                                { id: 'image', label: 'Image' },
                                { id: 'html', label: 'Html' },
                                { id: 'ai_tool', label: 'AI 도구' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.id ? 'bg-blue-100 text-blue-700' : 'bg-white border text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* List - Scrollable */}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">로딩 중...</div>
                    ) : filteredMaterials.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            등록된 자료가 없습니다.
                        </div>
                    ) : (
                        filteredMaterials.map((material) => {
                            let Icon = FileText;
                            if (material.type === 'video') Icon = PlayCircle;
                            if (material.type === 'image') Icon = ImageIcon;
                            if (material.type === 'html') Icon = FileCode;
                            if (material.type === 'link') Icon = LinkIcon;
                            if (material.type === 'ai_tool') Icon = Bot;

                            return (
                                <div
                                    key={material.id}
                                    className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${!material.is_visible ? 'bg-gray-50 opacity-75' : ''}`}
                                    onClick={() => setViewingMaterial(material)}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`p-3 rounded-lg shrink-0 ${material.type === 'pdf' ? 'bg-red-50 text-red-600' :
                                            material.type === 'video' ? 'bg-purple-50 text-purple-600' :
                                                material.type === 'image' ? 'bg-green-50 text-green-600' :
                                                    material.type === 'ai_tool' ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-blue-50 text-blue-600'
                                            }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    {material.weeks?.week_number === 0 ? "공통" : `Week ${material.weeks?.week_number || "?"}`}
                                                </span>
                                                {!material.is_visible && (
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                                        비공개
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 truncate">
                                                {material.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate max-w-xl">
                                                {material.description?.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(#+)(.*)/g, '$2').replace(/!\[.*?\]\(.*?\)/g, '[이미지]').replace(/\[.*?\]\(.*?\)/g, '[링크]') || material.content_url}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {material.content_url && ['pdf', 'html'].includes(material.type) && (
                                            <button
                                                onClick={(e) => handleMaterialAccess(e, material)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                title="다운로드"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        )}
                                        {isInstructor && (
                                            <>
                                                <div className={`flex flex-col gap-1 mr-2 ${isFiltering ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                    <button
                                                        onClick={(e) => !isFiltering && handleMoveMaterial(material.id, 'up', e)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title={isFiltering ? "필터 적용 중에는 이동 불가" : "위로 이동"}
                                                        disabled={isFiltering}
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => !isFiltering && handleMoveMaterial(material.id, 'down', e)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title={isFiltering ? "필터 적용 중에는 이동 불가" : "아래로 이동"}
                                                        disabled={isFiltering}
                                                    >
                                                        <ArrowDown className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <button onClick={(e) => handleEditClick(material, e)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button onClick={(e) => handleDeleteClick(material.id, e)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Creation/Edit Modal */}
            {
                isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b flex justify-between items-center bg-white z-10">
                                <h2 className="text-xl font-bold">{editingMaterial ? "자료 수정" : "새 자료 등록"}</h2>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <form id="materialForm" onSubmit={handleSubmit} className="space-y-6">
                                    {/* Flex Container for Week & Title */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">주차 선택 <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.week_id}
                                                onChange={(e) => setFormData({ ...formData, week_id: e.target.value })}
                                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">주차를 선택하세요</option>
                                                {weeks.map(week => (
                                                    <option key={week.id} value={week.id}>
                                                        {week.week_number === 0 ? "[공통] 공통 학습 자료" : `${week.week_number}주차 - ${week.title}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">제목 <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="자료 제목을 입력하세요"
                                            />
                                        </div>
                                    </div>

                                    {/* Type Selector */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">유형 선택 <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                                            {[
                                                { id: 'link', label: '링크', icon: LinkIcon },
                                                { id: 'video', label: '동영상', icon: PlayCircle },
                                                { id: 'pdf', label: 'PDF', icon: FileText },
                                                { id: 'image', label: '이미지', icon: ImageIcon },
                                                { id: 'html', label: 'HTML', icon: FileCode },
                                                { id: 'text', label: '텍스트', icon: BookOpen },
                                                { id: 'ai_tool', label: 'AI 도구', icon: Bot },
                                            ].map((type) => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: type.id as any })}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.type === type.id
                                                        ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200 ring-offset-1'
                                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <type.icon className="w-5 h-5 mb-1" />
                                                    <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{type.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Main Content Input */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            {['pdf', 'image', 'video', 'html'].includes(formData.type) ? '대표 파일 업로드' : '대표 링크 주소 (URL)'}
                                        </label>
                                        {['pdf', 'image', 'video', 'html'].includes(formData.type) ? (
                                            <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                    accept={
                                                        formData.type === 'pdf' ? '.pdf' :
                                                            formData.type === 'image' ? 'image/*' :
                                                                formData.type === 'html' ? '.html,text/html' :
                                                                    'video/*'
                                                    }
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                                {editingMaterial && formData.content_url && !file && (
                                                    <p className="text-xs text-gray-500 mt-2 px-2">
                                                        현재 파일: <a href={formData.content_url} target="_blank" className="text-blue-600 hover:underline">{formData.content_url.split('/').pop()}</a> (변경하려면 새 파일을 선택하세요)
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <input
                                                type="url"
                                                value={formData.content_url}
                                                onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="https://example.com"
                                            />
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">※ 목록에서 바로 접근할 수 있는 대표 콘텐츠입니다.</p>
                                    </div>

                                    {/* Rich Description */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">상세 설명</label>
                                        <div className="border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full p-4 border-none outline-none h-48 resize-none text-base"
                                                placeholder="자료에 대한 상세 설명을 입력하세요. 아래 버튼을 사용하여 이미지, 동영상, 링크를 추가할 수 있습니다."
                                            />
                                            <div className="bg-gray-50 p-2 flex gap-2 border-t flex-wrap items-center">
                                                {/* Formatting Tools */}
                                                <div className="flex items-center gap-1 pr-3 border-r border-gray-200 mr-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => insertText('**', '**')}
                                                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                                                        title="굵게"
                                                    >
                                                        <Bold className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => insertText('<span style="font-size: 1.5em; font-weight: bold;">', '</span>')}
                                                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                                                        title="제목 (크게)"
                                                    >
                                                        <Type className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center gap-1 ml-1">
                                                        <button type="button" onClick={() => insertText('<span style="color: #ef4444;">', '</span>')} className="w-5 h-5 rounded-full bg-red-500 hover:ring-2 ring-offset-1 ring-red-300" title="빨강"></button>
                                                        <button type="button" onClick={() => insertText('<span style="color: #3b82f6;">', '</span>')} className="w-5 h-5 rounded-full bg-blue-500 hover:ring-2 ring-offset-1 ring-blue-300" title="파랑"></button>
                                                        <button type="button" onClick={() => insertText('<span style="color: #22c55e;">', '</span>')} className="w-5 h-5 rounded-full bg-green-500 hover:ring-2 ring-offset-1 ring-green-300" title="초록"></button>
                                                    </div>
                                                </div>

                                                {/* Media Tools */}
                                                <button
                                                    type="button"
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                                                    title="이미지 추가"
                                                >
                                                    <ImageIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => videoInputRef.current?.click()}
                                                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-white rounded-lg transition-colors"
                                                    title="동영상 추가"
                                                >
                                                    <PlayCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleLinkInsert}
                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-white rounded-lg transition-colors"
                                                    title="링크 추가"
                                                >
                                                    <LinkIcon className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => htmlInputRef.current?.click()}
                                                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-white rounded-lg transition-colors"
                                                    title="HTML 파일 추가"
                                                >
                                                    <FileCode className="w-5 h-5" />
                                                </button>

                                                {/* Hidden Inputs */}
                                                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleDescriptionUpload(e, 'image')} />
                                                <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleDescriptionUpload(e, 'video')} />
                                                <input type="file" ref={htmlInputRef} className="hidden" accept=".html,text/html" onChange={(e) => handleDescriptionUpload(e, 'html')} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Visibility Toggle */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                        <span className={`text-sm font-medium ${formData.is_visible ? "text-blue-600" : "text-gray-500"}`}>
                                            {formData.is_visible ? "학생들에게 공개됨" : "학생들에게 숨김 (비공개)"}
                                        </span>
                                        <div className="flex-1" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_visible: !formData.is_visible })}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_visible ? 'bg-blue-600' : 'bg-gray-200'
                                                }`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_visible ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                </form>
                            </div>

                            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 z-10">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    form="materialForm"
                                    disabled={isUploading}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {editingMaterial ? "수정완료" : "자료등록"}
                                </button>
                            </div>
                        </div >
                    </div >
                )
            }

            {/* Detail View Modal */}
            {
                viewingMaterial && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingMaterial(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="p-6 border-b flex justify-between items-start bg-white shrink-0">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {viewingMaterial.weeks?.week_number === 0 ? "공통" : `Week ${viewingMaterial.weeks?.week_number || "?"}`}
                                        </span>
                                        {viewingMaterial.type === 'ai_tool' && (
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">AI 도구</span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">{viewingMaterial.title}</h2>
                                </div>
                                <button onClick={() => setViewingMaterial(null)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {/* Main Content Info */}
                                {viewingMaterial.content_url && (
                                    <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer"
                                            onClick={(e) => handleMaterialAccess(e, viewingMaterial)}
                                        >
                                            <div className="bg-white p-3 rounded-lg border shadow-sm">
                                                {viewingMaterial.type === 'link' ? <LinkIcon className="w-6 h-6 text-blue-600" /> :
                                                    viewingMaterial.type === 'pdf' ? <FileText className="w-6 h-6 text-red-600" /> :
                                                        viewingMaterial.type === 'video' ? <PlayCircle className="w-6 h-6 text-purple-600" /> :
                                                            viewingMaterial.type === 'html' ? <FileCode className="w-6 h-6 text-orange-600" /> :
                                                                viewingMaterial.type === 'ai_tool' ? <Bot className="w-6 h-6 text-indigo-600" /> :
                                                                    <Download className="w-6 h-6 text-gray-600" />}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleMaterialAccess(e, viewingMaterial)}
                                            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition shadow-sm"
                                        >
                                            {['pdf', 'html', 'image'].includes(viewingMaterial.type) ? "다운로드" : "바로가기"}
                                        </button>
                                    </div>
                                )}

                                {/* Markdown Description */}
                                <div className="prose prose-blue max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkBreaks]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={MarkdownComponents}
                                    >
                                        {viewingMaterial.description || "상세 설명이 없습니다."}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


