"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle, Circle, FileText, PlayCircle, Lock, Plus, Trash2, X } from "lucide-react";

type Material = {
    id: string;
    title: string;
    type: 'video' | 'text' | 'pdf' | 'link';
    content_url?: string;
    description?: string;
};

type Week = {
    id: string;
    week_number: number;
    title: string;
    description: string;
};

export default function WeekDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [week, setWeek] = useState<Week | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [progress, setProgress] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Instructor State
    const [isInstructor, setIsInstructor] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [newMaterial, setNewMaterial] = useState({ title: '', type: 'link', description: '', content_url: '' });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Get User & Role
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                setIsInstructor(userData?.role === 'instructor');

                // Fetch Progress (Student only usually, but good for testing)
                const { data: progressData } = await supabase
                    .from('user_progress')
                    .select('material_id')
                    .eq('user_id', session.user.id)
                    .eq('is_completed', true);

                if (progressData) {
                    setProgress(new Set(progressData.map(p => p.material_id)));
                }
            }

            // Fetch Week Data
            const { data: weekData, error: weekError } = await supabase
                .from('weeks')
                .select('*')
                .eq('week_number', parseInt(id))
                .single();

            if (weekError || !weekData) {
                console.error("Error fetching week:", weekError);
                setWeek(null);
                setLoading(false);
                return;
            }

            setWeek(weekData);

            // Fetch Materials
            const { data: materialsData, error: materialsError } = await supabase
                .from('materials')
                .select('*')
                .eq('week_id', weekData.id)
                .order('created_at', { ascending: true });

            if (materialsError) {
                console.error("Error fetching materials:", materialsError);
            } else {
                setMaterials(materialsData || []);
            }

            setLoading(false);
        };

        fetchData();
    }, [id]);

    const toggleProgress = async (materialId: string) => {
        if (!user) {
            alert("로그인이 필요한 기능입니다.");
            return;
        }

        const newIsCompleted = !progress.has(materialId);

        // Optimistic UI Update
        const newProgress = new Set(progress);
        if (newIsCompleted) newProgress.add(materialId);
        else newProgress.delete(materialId);
        setProgress(newProgress);

        // DB Update
        const { error } = await supabase.from('user_progress').upsert({
            user_id: user.id,
            material_id: materialId,
            is_completed: newIsCompleted,
            completed_at: newIsCompleted ? new Date().toISOString() : null
        }, { onConflict: 'user_id, material_id' });

        if (error) {
            console.error("Failed to update progress", error);
            // Revert on error
            if (newIsCompleted) newProgress.delete(materialId);
            else newProgress.add(materialId);
            setProgress(new Set(newProgress));
        }
    };

    const handleSaveMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!week) return;

        if (editingMaterial) {
            // Update Mode
            const { error } = await supabase.from('materials').update({
                title: newMaterial.title,
                type: newMaterial.type,
                description: newMaterial.description,
                content_url: newMaterial.content_url
            }).eq('id', editingMaterial.id);

            if (error) {
                alert("수정 실패: " + error.message);
            } else {
                setMaterials(materials.map(m => m.id === editingMaterial.id ? { ...m, ...newMaterial } as Material : m));
                setIsAdding(false);
                setEditingMaterial(null);
                setNewMaterial({ title: '', type: 'link', description: '', content_url: '' });
            }
        } else {
            // Create Mode
            const { data, error } = await supabase.from('materials').insert({
                week_id: week.id,
                title: newMaterial.title,
                type: newMaterial.type as any,
                description: newMaterial.description,
                content_url: newMaterial.content_url
            }).select().single();

            if (error) {
                alert("저장 실패: " + error.message);
            } else if (data) {
                setMaterials([...materials, data]);
                setIsAdding(false);
                setNewMaterial({ title: '', type: 'link', description: '', content_url: '' });
            }
        }
    };

    const handleEditClick = (material: Material) => {
        setEditingMaterial(material);
        setNewMaterial({
            title: material.title,
            type: material.type,
            description: material.description || '',
            content_url: material.content_url || ''
        });
        setIsAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteMaterial = async (materialId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase.from('materials').delete().eq('id', materialId);
        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            setMaterials(materials.filter(m => m.id !== materialId));
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
                <div className="space-y-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!week) return <div>Week not found</div>;

    const progressPercentage = materials.length > 0
        ? Math.round((progress.size / materials.length) * 100)
        : 0;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-gray-500 hover:text-blue-600 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로 돌아가기
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-blue-600 font-bold tracking-wider text-sm uppercase block">
                                Week {week.week_number} Curriculum
                            </span>
                            {isInstructor && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200">
                                    강사 모드
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                            {week.title}
                        </h1>
                        <p className="text-gray-500 text-lg max-w-2xl">
                            {week.description}
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm min-w-[200px]">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-600">진도율</span>
                            <span className="text-lg font-bold text-blue-600">{progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructor Add Button */}
            {isInstructor && !isAdding && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all mb-8 group"
                >
                    <Plus className="w-6 h-6 mr-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">새로운 학습 자료 추가하기</span>
                </button>
            )}

            {/* Add Material Form */}
            {isInstructor && isAdding && (
                <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-md mb-8 ring-4 ring-blue-50/50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">
                            {editingMaterial ? "자료 수정" : "새 자료 등록"}
                        </h3>
                        <button onClick={() => {
                            setIsAdding(false);
                            setEditingMaterial(null);
                            setNewMaterial({ title: '', type: 'link', description: '', content_url: '' });
                        }} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSaveMaterial} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={newMaterial.title}
                                onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                placeholder="예: 강의 소개 영상"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={newMaterial.type}
                                    onChange={e => setNewMaterial({ ...newMaterial, type: e.target.value as any })}
                                >
                                    <option value="video">영상 (Video)</option>
                                    <option value="link">링크 (Link)</option>
                                    <option value="pdf">PDF 파일</option>
                                    <option value="text">텍스트/글</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">링크 주소 (URL)</label>
                                <input
                                    type="url"
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    value={newMaterial.content_url}
                                    onChange={e => setNewMaterial({ ...newMaterial, content_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                            <textarea
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={newMaterial.description}
                                onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })}
                                placeholder="간단한 설명을 입력하세요"
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">등록하기</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Materials List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-700" />
                    학습 자료
                </h2>

                {materials.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed text-gray-500">
                        등록된 학습 자료가 없습니다.
                    </div>
                )}

                <div className="grid gap-4">
                    {materials.map((material) => {
                        const isCompleted = progress.has(material.id);
                        const Icon = material.type === 'video' ? PlayCircle : FileText;

                        return (
                            <div
                                key={material.id}
                                className={`group bg-white rounded-xl border p-6 transition-all ${isCompleted ? "border-green-200 bg-green-50/30" : "hover:border-blue-300 hover:shadow-md"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${isCompleted ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-600"
                                        }`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`text-lg font-bold mb-1 group-hover:text-blue-700 transition-colors ${isCompleted ? "text-gray-800" : "text-gray-900"
                                                }`}>
                                                {material.title}
                                            </h3>

                                            {isInstructor ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditClick(material)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                        title="재료 수정"
                                                    >
                                                        <FileText className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMaterial(material.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="재료 삭제"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => toggleProgress(material.id)}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isCompleted
                                                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                        }`}
                                                >
                                                    {isCompleted ? (
                                                        <>
                                                            <CheckCircle className="w-4 h-4" />
                                                            완료됨
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle className="w-4 h-4" />
                                                            완료 표시
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4">
                                            {material.description}
                                        </p>

                                        <div className="flex gap-2">
                                            {material.content_url && material.content_url !== '#' ? (
                                                <a
                                                    href={material.content_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors inline-block text-center"
                                                >
                                                    학습하기
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => alert("준비 중인 자료입니다.")}
                                                    className="px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
                                                >
                                                    준비 중
                                                </button>
                                            )}

                                            {material.type === 'video' && (
                                                <span className="px-3 py-2 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg flex items-center">
                                                    15:00
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
