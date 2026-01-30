
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
    Loader2, Upload, FileText, Link as LinkIcon, Image as ImageIcon,
    Video, FileCode, Plus, MoreVertical, X, Pencil, Trash2,
    Eye, EyeOff, GripVertical, Check, PlayCircle, Bold, Type,
    Folder, Download, Search, BookOpen, Edit2, CheckCircle, Bot, Globe, Palette, ArrowUp, ArrowDown
} from 'lucide-react';
import { supabase } from "@/utils/supabase/client";
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import 'react-quill-new/dist/quill.snow.css';

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

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
    summary?: string;
};

type Week = {
    id: string;
    title: string;
    week_number: number;
};

const MarkdownComponents = {
    img: ({ node, ...props }: any) => (
        <img
            {...props}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '0.5rem', margin: '1rem 0' }}
            alt={props.alt || ''}
        />
    ),
    a: ({ node, ...props }: any) => (
        <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
    ),
    p: ({ node, ...props }: any) => (
        <p {...props} className="mb-4 text-gray-700 leading-relaxed" />
    )
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
    const quillRef = useRef<any>(null); // For rich text editor

    // Form State
    const [formData, setFormData] = useState({
        week_id: "",
        title: "",
        type: "link" as Material['type'],
        content_url: "",
        description: "", // Now supports HTML from Quill
        summary: "",
        is_visible: true
    });
    const [file, setFile] = useState<File | null>(null);
    // activeTab removed as using WYSIWYG editor

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
    weeks(
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
        const fileName = `${Date.now()} -${Math.random().toString(36).substring(2)}.${fileExt} `;
        const filePath = `${fileName} `;

        const { error: uploadError } = await supabase.storage
            .from('lecture_materials')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('lecture_materials')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    // Custom Image Handler for Quill
    const imageHandler = () => {
        imageInputRef.current?.click();
    };

    // Custom Link Handler for Quill
    const linkHandler = () => {
        const quill = quillRef.current?.getEditor ? quillRef.current.getEditor() : quillRef.current;
        if (!quill) return;

        const range = quill.getSelection();
        const url = prompt("링크 주소(URL)를 입력해주세요:");
        if (!url) return; // User cancelled

        if (range && range.length > 0) {
            quill.format('link', url);
        } else {
            const text = prompt("링크에 표시할 텍스트를 입력해주세요:") || url;
            quill.insertText(range ? range.index : quill.getLength(), text, 'link', url);
        }
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image']
            ],
            handlers: {
                image: imageHandler,
                link: linkHandler
            }
        }
    }), []);

    const handleDescriptionUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'html') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('lecture_materials')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('lecture_materials')
                .getPublicUrl(filePath);

            // Insert into Quill
            if (quillRef.current) {
                // Determine if the ref is the component or the editor instance directly
                // ReactQuill ref usually exposes getEditor()
                const editor = quillRef.current.getEditor ? quillRef.current.getEditor() : quillRef.current;

                // Ensure we have an editor instance
                if (editor && editor.getSelection) {
                    const range = editor.getSelection();
                    const index = range ? range.index : editor.getLength();

                    if (type === 'image') {
                        editor.insertEmbed(index, 'image', publicUrl);
                    } else {
                        editor.insertText(index, `[${type.toUpperCase()}: ${file.name}]`, 'link', publicUrl);
                    }
                    // Move cursor to next line
                    editor.setSelection(index + 1);
                }
            } else {
                // Fallback if Quill ref is not ready (should not happen in edit mode)
                setFormData(prev => ({
                    ...prev,
                    description: prev.description + (type === 'image' ? `\n![${file.name}](${publicUrl})` : `\n[${file.name}](${publicUrl})`)
                }));
            }

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('업로드 실패: ' + error.message);
        } finally {
            if (imageInputRef.current) imageInputRef.current.value = '';
            if (videoInputRef.current) videoInputRef.current.value = '';
            if (htmlInputRef.current) htmlInputRef.current.value = '';
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
        const markdown = `\n[${text}](${url}) \n`;
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
                    summary: formData.summary,
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
                    summary: formData.summary,
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
            summary: item.summary || "",
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
        setFormData({ week_id: "", title: "", type: "link", content_url: "", description: "", summary: "", is_visible: true });
        setFile(null);

    };

    // Filter Logic
    const isInstructor = userRole === 'instructor';
    const isFiltering = searchTerm !== "" || selectedType !== "all";
    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.weeks?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || m.type === selectedType;
        const matchesVisibility = isInstructor || m.is_visible !== false; // Hide hidden items from students
        return matchesSearch && matchesType && matchesVisibility;
    });

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
                        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar">
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
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedType === type.id ? 'bg-blue-100 text-blue-700' : 'bg-white border text-gray-600 hover:bg-gray-50'
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
    .custom - scrollbar:: -webkit - scrollbar {
    width: 6px;
}
                    .custom - scrollbar:: -webkit - scrollbar - track {
    background: transparent;
}
                    .custom - scrollbar:: -webkit - scrollbar - thumb {
    background - color: #e5e7eb;
    border - radius: 20px;
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
                                    className={`py-6 px-6 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${!material.is_visible ? 'bg-gray-50 opacity-75' : ''} `}
                                    onClick={() => setViewingMaterial(material)}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`p-3 rounded-lg shrink-0 ${material.type === 'pdf' ? 'bg-red-50 text-red-600' :
                                            material.type === 'video' ? 'bg-purple-50 text-purple-600' :
                                                material.type === 'image' ? 'bg-green-50 text-green-600' :
                                                    material.type === 'ai_tool' ? 'bg-indigo-50 text-indigo-600' :
                                                        'bg-blue-50 text-blue-600'
                                            } `}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
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
                                            <div className="text-sm text-gray-400 h-5 overflow-hidden flex items-center gap-1">
                                                {material.summary ? (
                                                    <p className="truncate w-full">{material.summary}</p>
                                                ) : (
                                                    (() => {
                                                        let text = material.description || "";
                                                        // Normalize HTML/Markdown to Markers
                                                        if (text.includes('<')) {
                                                            text = text.replace(/<img[^>]*>/g, '___IMG___');
                                                            text = text.replace(/<a[^>]*>.*?<\/a>/g, '___LINK___');
                                                            text = text.replace(/<[^>]+>/g, ''); // Strip remaining tags
                                                            text = text.replace(/&nbsp;/g, ' '); // Fix: Replace &nbsp; with space
                                                        }

                                                        // Process Markdown (always run this to catch Markdown inside HTML or plain Markdown)
                                                        text = text.replace(/!\[.*?\]\(.*?\)/g, '___IMG___');
                                                        text = text.replace(/\[.*?\]\(.*?\)/g, '___LINK___');
                                                        text = text.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(#+)(.*)/g, '$2');

                                                        if (!text && material.content_url) return <span className="truncate">{material.content_url}</span>;

                                                        const parts = text.split(/(___IMG___|___LINK___)/g);
                                                        return (
                                                            <div className="truncate w-full flex items-center gap-1">
                                                                {parts.map((part, i) => {
                                                                    if (part === '___IMG___') return <span key={i} className="inline-flex items-center gap-0.5 bg-gray-100 px-1.5 rounded text-[11px] text-gray-500 align-middle shrink-0"><ImageIcon className="w-3 h-3" />이미지</span>;
                                                                    if (part === '___LINK___') return <span key={i} className="inline-flex items-center gap-0.5 bg-gray-100 px-1.5 rounded text-[11px] text-gray-500 align-middle shrink-0"><LinkIcon className="w-3 h-3" />링크</span>;
                                                                    return <span key={i}>{part}</span>;
                                                                })}
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Download button removed as per request */}
                                        {isInstructor && (
                                            <>
                                                <div className={`flex flex - col gap - 1 mr - 2 ${isFiltering ? 'opacity-30 cursor-not-allowed' : ''} `}>
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
                            <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50/50 z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{editingMaterial ? "자료 수정" : "새 자료 등록"}</h2>
                                    <p className="text-sm text-gray-500 mt-1">학생들에게 제공할 학습 자료를 등록하거나 수정합니다.</p>
                                </div>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-white">
                                <form id="materialForm" onSubmit={handleSubmit} className="space-y-8">
                                    {/* Section 1: Basic Info */}
                                    <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="col-span-2 md:col-span-2 mb-2">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                                <span className="w-1 h-6 bg-blue-500 rounded-full inline-block"></span>
                                                기본 정보
                                            </h3>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">주차 선택 <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.week_id}
                                                onChange={(e) => setFormData({ ...formData, week_id: e.target.value })}
                                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                            >
                                                <option value="">주차를 선택하세요</option>
                                                {weeks.map(week => (
                                                    <option key={week.id} value={week.id}>
                                                        {week.week_number === 0 ? "[공통] 공통 학습 자료" : `${week.week_number} 주차 - ${week.title} `}
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
                                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                placeholder="자료 제목을 입력하세요"
                                            />
                                        </div>
                                    </div>

                                    {/* Section 2: Content Type & URL */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                                <span className="w-1 h-6 bg-green-500 rounded-full inline-block"></span>
                                                자료 유형 및 콘텐츠
                                            </h3>

                                            <label className="block text-sm font-bold text-gray-700 mb-2">유형 선택 <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
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
                                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${formData.type === type.id
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                            : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                                                            } `}
                                                    >
                                                        <type.icon className="w-5 h-5 mb-1.5" />
                                                        <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">{type.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Main Content Input */}
                                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                            <label className="block text-sm font-bold text-gray-800 mb-2">
                                                {['pdf', 'image', 'video', 'html'].includes(formData.type) ? '대표 파일 업로드' : '대표 링크 주소 (URL)'}
                                            </label>
                                            {['pdf', 'image', 'video', 'html'].includes(formData.type) ? (
                                                <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 bg-white hover:bg-blue-50/30 transition-colors text-center cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
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
                                                        className="hidden"
                                                    />
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Upload className="w-8 h-8 text-blue-400 group-hover:text-blue-600 transition-colors" />
                                                        <p className="text-sm font-medium text-gray-600 group-hover:text-blue-700">
                                                            {file ? file.name : "클릭하여 파일을 선택하세요"}
                                                        </p>
                                                        {!file && <p className="text-xs text-gray-400">또는 파일을 여기로 드래그하세요</p>}
                                                    </div>
                                                    {editingMaterial && formData.content_url && !file && (
                                                        <p className="text-xs text-gray-500 mt-4 px-2 pt-4 border-t w-full">
                                                            현재 파일: <a href={formData.content_url} target="_blank" className="text-blue-600 hover:underline font-medium">{formData.content_url.split('/').pop()}</a>
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="url"
                                                        value={formData.content_url}
                                                        onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm transition-all"
                                                        placeholder="https://example.com"
                                                    />
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                목록에서 학생들이 클릭했을 때 바로 이동하는 주요 콘텐츠입니다.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Section 3: Descriptions */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                                                <span className="w-1 h-6 bg-purple-500 rounded-full inline-block"></span>
                                                설명 및 상세 내용
                                            </h3>

                                            {/* Summary Input */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">한줄 설명 (목록 표시용)</label>
                                                <input
                                                    type="text"
                                                    value={formData.summary || ""}
                                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                    placeholder="목록에 표시될 짧은 설명을 입력하세요."
                                                />
                                                <p className="text-xs text-gray-500 mt-1">※ 이 설명은 목록 화면에서 제목 아래에 표시됩니다.</p>
                                            </div>

                                            {/* Rich Description - ReactQuill */}
                                            <div>
                                                <div className="flex justify-between items-end mb-2">
                                                    <label className="block text-sm font-bold text-gray-700">상세 설명</label>
                                                    <span className="text-xs text-gray-400">이미지 및 링크 삽입 가능</span>
                                                </div>
                                                <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white shadow-sm" style={{ minHeight: '300px' }}>
                                                    <ReactQuill
                                                        ref={quillRef}
                                                        theme="snow"
                                                        value={formData.description}
                                                        onChange={(value) => setFormData({ ...formData, description: value })}
                                                        modules={modules}
                                                        className="h-64"
                                                        placeholder="자료에 대한 상세 설명을 입력하세요."
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2">※ 텍스트, 이미지, 비디오 등을 자유롭게 작성할 수 있습니다.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hidden Inputs for Custom Handler */}
                                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleDescriptionUpload(e, 'image')} />
                                    <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleDescriptionUpload(e, 'video')} />
                                    <input type="file" ref={htmlInputRef} className="hidden" accept=".html,text/html" onChange={(e) => handleDescriptionUpload(e, 'html')} />
                                    {/* Visibility Toggle */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                        <span className={`text-sm font-medium ${formData.is_visible ? "text-blue-600" : "text-gray-500"} `}>
                                            {formData.is_visible ? "학생들에게 공개됨" : "학생들에게 숨김 (비공개)"}
                                        </span>
                                        <div className="flex-1" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_visible: !formData.is_visible })}
                                            className={`relative w-12 h-7 transition-colors duration-200 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 border-2 border-transparent ${formData.is_visible ? 'bg-blue-600' : 'bg-gray-200'}`}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`inline-block w-5 h-5 bg-white rounded-full shadow transform ring-0 transition duration-200 ease-in-out pointer-events-none ${formData.is_visible ? 'translate-x-5' : 'translate-x-0'}`}
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
                                            {viewingMaterial.weeks?.week_number === 0 ? "공통" : `Week ${viewingMaterial.weeks?.week_number || "?"} `}
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
                                {/* Markdown Description */}
                                <div className="prose prose-blue max-w-none">
                                    {(() => {
                                        const description = viewingMaterial.description || "상세 설명이 없습니다.";
                                        // Check if content is HTML (from Quill) or Legacy Markdown
                                        const isHtml = /<[a-z][\s\S]*>/i.test(description) || description.includes('<p>');

                                        if (isHtml) {
                                            let processedHtml = description;

                                            // 1. Ensure standard HTML links open in new tab
                                            processedHtml = processedHtml.replace(/<a href/g, '<a target="_blank" rel="noopener noreferrer" href');

                                            // 2. Convert Legacy Markdown Images (e.g. <p>![alt](url)</p>) to HTML
                                            processedHtml = processedHtml.replace(/!\[([^\]]*)\]\(([^)]*)\)/g,
                                                '<img src="$2" alt="$1" class="rounded-lg shadow-sm my-2" style="max-width: 100%; height: auto;" />'
                                            );

                                            // 3. Convert Legacy Markdown Links to HTML
                                            processedHtml = processedHtml.replace(/\[([^\]]*)\]\(([^)]*)\)/g,
                                                '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
                                            );

                                            return (
                                                <div
                                                    dangerouslySetInnerHTML={{
                                                        __html: processedHtml
                                                    }}
                                                />
                                            );
                                        }

                                        return (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkBreaks]}
                                                rehypePlugins={[rehypeRaw]}
                                                components={MarkdownComponents}
                                            >
                                                {description}
                                            </ReactMarkdown>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}


