"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, Clock, Lock, Sparkles, Star, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [weeks, setWeeks] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            // Fetch Roll
            if (session?.user) {
                const { data: userData, error: roleError } = await supabase.from('users').select('role').eq('id', session.user.id).single();
                if (roleError) console.error("Role fetch error:", roleError);
                console.log("Fetched User Role:", userData?.role);
                setUserRole(userData?.role || 'student');
            }

            // Fetch Weeks
            const { data: weeksData } = await supabase
                .from('weeks')
                .select('*')
                .order('week_number', { ascending: true });

            if (weeksData) {
                // Determine status based on logic (For now, unlock all if data exists, or implement progress logic later)
                // Here we just map to the UI format
                const formattedWeeks = weeksData.map(week => ({
                    id: week.week_number, // Use week_number for ID in UI
                    db_id: week.id,       // Real UUID
                    title: week.title,
                    subtitle: `${week.week_number}주차 과정`,
                    description: week.description,
                    status: week.is_current ? "in-progress" : "completed" // Simplification: All unlocked, but only current blinks
                }));
                setWeeks(formattedWeeks);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const [editingWeek, setEditingWeek] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ title: '', description: '' });

    const handleEditClick = (week: any) => {
        setEditingWeek(week);
        setEditForm({ title: week.title, description: week.description });
    };

    const handleSaveWeek = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWeek) return;

        const { error } = await supabase
            .from('weeks')
            .update({
                title: editForm.title,
                description: editForm.description
            })
            .eq('id', editingWeek.db_id);

        if (error) {
            console.error('Error updating week:', error);
            alert('업데이트 실패: ' + error.message);
        } else {
            // Optimistic update
            setWeeks(weeks.map(w => w.db_id === editingWeek.db_id ? { ...w, ...editForm } : w));
            setEditingWeek(null);
        }
    };

    const handleSetCurrentWeek = async (weekId: string) => {
        // Optimistic update for UI responsiveness
        const targetWeek = weeks.find(w => w.db_id === weekId);
        if (!targetWeek) return;

        setWeeks(weeks.map(w => ({
            ...w,
            is_current: w.db_id === weekId,
            status: w.db_id === weekId ? "in-progress" : (w.week_number < targetWeek.week_number ? "completed" : "locked")
        })));

        // Reset all weeks first
        await supabase.from('weeks').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000');

        // Set new current week
        const { error } = await supabase.from('weeks').update({ is_current: true }).eq('id', weekId);

        if (error) {
            console.error('Error setting current week:', error);
            // Revert or alert needed in real prod, but strict reload ensures consistency
            window.location.reload();
        }
    };

    const isInstructor = userRole === 'instructor';
    const currentWeek = weeks.find(w => w.is_current);
    const displayName = user?.email ? user.email.split('@')[0] + "님" : "학습자님";

    return (
        <div className="space-y-10 pb-10">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-4 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-sm font-medium backdrop-blur-sm">
                                <Sparkles className="w-4 h-4 text-blue-200" />
                                <span>AI Course Platform</span>
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                                {loading ? (
                                    <span className="animate-pulse bg-white/20 rounded h-12 w-64 block"></span>
                                ) : (
                                    <>
                                        안녕하세요, {displayName}! <br />
                                        <span className="text-blue-200">AI 마스터 여정</span>을 계속해볼까요?
                                    </>
                                )}
                            </h1>
                            <p className="text-blue-100 text-lg md:text-xl max-w-lg">
                                16주간의 커리큘럼을 통해 AI 도구 활용 마스터가 되어보세요.
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 w-full md:w-auto min-w-[300px]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-blue-100">현재 진행률</span>
                                <span className="text-2xl font-bold">15%</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-3 mb-2 overflow-hidden">
                                <div className="bg-white h-full rounded-full w-[15%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                            <p className="text-xs text-blue-200 text-right">
                                {currentWeek ? `${currentWeek.id}주차 학습 진행 중` : "학습 준비 중"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Course Grid */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                        주차별 커리큘럼
                    </h2>
                    <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                        총 16주 과정
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {weeks.map((week) => (
                        <WeekCard
                            key={week.id}
                            week={week}
                            isInstructor={isInstructor}
                            onEdit={() => handleEditClick(week)}
                            onSetCurrent={() => handleSetCurrentWeek(week.db_id)}
                        />
                    ))}
                </div>
            </div>

            {/* Edit Modal */}
            {editingWeek && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">주차 정보 수정</h3>
                        <form onSubmit={handleSaveWeek} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingWeek(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function WeekCard({ week, isInstructor, onEdit, onSetCurrent }: { week: any, isInstructor: boolean, onEdit: () => void, onSetCurrent: () => void }) {
    // Determine status logic here if needed, for now using passed status
    const isLocked = week.status === "locked";
    // ... rest of component logic (can reuse existing styles)
    const isCompleted = week.status === "completed";
    const isInProgress = week.status === "in-progress";

    return (
        <div className="relative h-full">
            {/* Instructor Controls */}
            {isInstructor && (
                <div className="absolute top-2 right-2 z-20 flex gap-1">
                    <button
                        onClick={(e) => { e.preventDefault(); onSetCurrent(); }}
                        className={`p-1.5 rounded-full shadow-sm border transition-colors ${isInProgress ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-400 hover:text-blue-600 border-gray-200"}`}
                        title="현재 진행 주차로 설정"
                    >
                        <Star className={`w-4 h-4 ${isInProgress ? "fill-current" : ""}`} />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); onEdit(); }}
                        className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-full shadow-sm border border-gray-200 transition-colors"
                        title="내용 수정"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            )}

            <Link
                href={isLocked ? "#" : `/weeks/${week.id}`}
                className={`group relative flex flex-col h-full bg-white rounded-2xl border transition-all duration-300 ${isLocked
                    ? "border-gray-100 opacity-70"
                    : "hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 cursor-pointer border-gray-200"
                    }`}
            >
                {isInProgress && (
                    <div className="absolute -top-3 -right-3 z-10">
                        <span className="relative flex h-6 w-6">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-6 w-6 bg-blue-500 border-2 border-white"></span>
                        </span>
                    </div>
                )}

                <div className={`p-6 flex-1 flex flex-col ${isLocked ? "grayscale-[0.5]" : ""}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCompleted ? "bg-green-100 text-green-600" :
                            isInProgress ? "bg-blue-600 text-white shadow-lg shadow-blue-200" :
                                "bg-gray-100 text-gray-400"
                            }`}>
                            {isCompleted ? <CheckCircle className="w-6 h-6" /> :
                                isInProgress ? <Clock className="w-6 h-6 animate-pulse" /> :
                                    <Lock className="w-5 h-5" />}
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isCompleted ? "bg-green-50 text-green-600" :
                            isInProgress ? "bg-blue-50 text-blue-600" :
                                "bg-gray-100 text-gray-400"
                            }`}>
                            Week {week.id}
                        </span>
                    </div>

                    <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {week.title}
                    </h3>
                    <p className="text-sm text-gray-400 font-medium mb-3">{week.subtitle}</p>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6 line-clamp-2">
                        {week.description}
                    </p>

                    {/* Visual Progress Bar (Mock) */}
                    {!isLocked && (
                        <div className="mt-auto pt-4 border-t border-gray-50">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>학습 진행률</span>
                                <span>0%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full w-0"></div>
                            </div>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
}

