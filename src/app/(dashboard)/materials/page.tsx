"use client";

import { useEffect, useState } from "react";
import { Folder, FileText, Download, Search, Plus, X, PlayCircle, Image as ImageIcon, FileCode, BookOpen, Link as LinkIcon, Trash2, Edit2, CheckCircle } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

type Material = {
    id: string;
    week_id: string;
    title: string;
    type: 'video' | 'text' | 'pdf' | 'link' | 'image' | 'html';
    content_url?: string;
    description?: string;
    created_at: string;
    weeks?: { title: string, week_number: number }; // Joined data
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
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        week_id: "",
        title: "",
        type: "link" as Material['type'],
        content_url: "",
        description: ""
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
                    content_url: finalContentUrl
                }).eq('id', editingMaterial.id);

                if (error) throw error;
            } else {
                const { error } = await supabase.from('materials').insert({
                    week_id: formData.week_id,
                    title: formData.title,
                    type: formData.type,
                    description: formData.description,
                    content_url: finalContentUrl
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

    const handleEditClick = (item: Material) => {
        setEditingMaterial(item);
        setFormData({
            week_id: item.week_id,
            title: item.title,
            type: item.type,
            content_url: item.content_url || "",
            description: item.description || ""
        });
        setFile(null);
        setIsAdding(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (!confirm("정말 이 자료를 삭제하시겠습니까?")) return;
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) alert("삭제 실패: " + error.message);
        else fetchData();
    };

    const handleCloseModal = () => {
        setIsAdding(false);
        setEditingMaterial(null);
        setFormData({ week_id: "", title: "", type: "link", content_url: "", description: "" });
        setFile(null);
    };

    // Filter Logic
    const filteredMaterials = materials.filter(m => {
        const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.weeks?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || m.type === selectedType;
        return matchesSearch && matchesType;
    });

    const isInstructor = userRole === 'instructor';

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
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                            {['all', 'video', 'pdf', 'link', 'image', 'html'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${selectedType === type ? 'bg-blue-100 text-blue-700' : 'bg-white border text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {type === 'all' ? '전체' : type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
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

                            return (
                                <div key={material.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`p-3 rounded-lg shrink-0 ${material.type === 'pdf' ? 'bg-red-50 text-red-600' :
                                            material.type === 'video' ? 'bg-purple-50 text-purple-600' :
                                                material.type === 'image' ? 'bg-green-50 text-green-600' :
                                                    'bg-blue-50 text-blue-600'
                                            }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    Week {material.weeks?.week_number || "?"}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(material.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900 truncate">
                                                {material.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate max-w-xl">
                                                {material.description || material.content_url}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {material.content_url && (
                                            <a
                                                href={material.content_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                title="보기/다운로드"
                                            >
                                                <Download className="w-5 h-5" />
                                            </a>
                                        )}
                                        {isInstructor && (
                                            <>
                                                <button onClick={() => handleEditClick(material)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors">
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(material.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
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

            {/* Modal */}
            {
                isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                                <h2 className="text-xl font-bold">{editingMaterial ? "자료 수정" : "새 자료 등록"}</h2>
                                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Week Selection */}
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
                                            <option key={week.id} value={week.id}>{week.week_number}주차 - {week.title}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Title */}
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

                                {/* Type Selector (Icons) */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">유형 선택 <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                        {[
                                            { id: 'link', label: '링크', icon: LinkIcon },
                                            { id: 'video', label: '동영상', icon: PlayCircle },
                                            { id: 'pdf', label: 'PDF', icon: FileText },
                                            { id: 'image', label: '이미지', icon: ImageIcon },
                                            { id: 'html', label: 'HTML', icon: FileCode },
                                            { id: 'text', label: '텍스트', icon: BookOpen },
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
                                                <type.icon className="w-6 h-6 mb-1" />
                                                <span className="text-xs font-medium">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Input */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        {['pdf', 'image', 'video', 'html'].includes(formData.type) ? '파일 업로드' : '링크 주소 (URL)'}
                                    </label>
                                    {['pdf', 'image', 'video', 'html'].includes(formData.type) ? (
                                        <div className="border border-gray-200 rounded-xl p-2 bg-gray-50">
                                            <input
                                                type="file"
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
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">설명 (선택)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                        placeholder="자료에 대한 간단한 설명을 입력하세요."
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isUploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                        {editingMaterial ? "수정완료" : "자료등록"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
