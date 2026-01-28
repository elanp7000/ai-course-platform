"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/utils/supabase/client";
import { Plus, Pencil, Trash2, X, Globe, User, FileCode, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface UnifiedItem {
    id: string;
    title: string;
    description: string;
    project_url?: string;
    created_at: string;
    user_id: string;
    author_name?: string;
    type: 'portfolio' | 'discussion';
    topic_id?: string;
}

interface Topic {
    id: string;
    title: string;
    description: string;
    created_at: string;
}

interface StudentProfile {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
}

function PortfolioContent() {
    const searchParams = useSearchParams();
    const isMyView = searchParams.get('view') === 'my';

    const [items, setItems] = useState<UnifiedItem[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<'student' | 'instructor' | null>(null);

    // Instructor Mode State
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTopicModal, setIsTopicModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ title: "", description: "", project_url: "", topic_id: "" });

    // Detail Modal State
    const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const htmlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        checkUserAndInit();
    }, [isMyView]);

    useEffect(() => {
        if (currentUser) {
            fetchPortfolios();
        }
    }, [selectedStudentId, currentUser]);

    const checkUserAndInit = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUser(session.user);

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            const role = profile?.role || 'student';
            setUserRole(role);

            await fetchPortfolios(session.user.id, role);

            if (role === 'instructor') {
                fetchStudentList();
            }
        } else {
            setIsLoading(false);
        }
    };

    const fetchStudentList = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('role', 'student')
            .order('name');

        if (!error && data) {
            setStudents(data);
        }
    };

    const fetchPortfolios = async (userId = currentUser?.id, role = userRole) => {
        if (!userId) return;

        setIsLoading(true);

        // Fetch Topics
        const { data: topicData } = await supabase
            .from('portfolio_topics')
            .select('*')
            .order('created_at', { ascending: false });
        if (topicData) setTopics(topicData);

        let portfolios = [];
        let discussions: UnifiedItem[] = [];

        // 1. Fetch Portfolios
        let portfolioQuery = supabase
            .from('portfolios')
            .select('*')
            .order('created_at', { ascending: false });

        if (isMyView) {
            if (role === 'instructor' && selectedStudentId) {
                portfolioQuery = portfolioQuery.eq('user_id', selectedStudentId);
            } else {
                portfolioQuery = portfolioQuery.eq('user_id', userId);
            }
        }

        const { data: pData, error: pError } = await portfolioQuery;
        if (pData) portfolios = pData.map(p => ({ ...p, type: 'portfolio' }));
        if (pError) console.error("Error fetching portfolios:", pError);

        // 2. Fetch Discussions (ONLY if isMyView)
        if (isMyView) {
            let discussionQuery = supabase
                .from('discussions')
                .select('*')
                .order('created_at', { ascending: false });

            let targetUserId = userId;
            if (role === 'instructor' && selectedStudentId) {
                targetUserId = selectedStudentId;
            }

            discussionQuery = discussionQuery.eq('author_id', targetUserId);

            const { data: dData, error: dError } = await discussionQuery;
            if (dData) {
                discussions = dData.map(d => ({
                    id: d.id,
                    title: d.title,
                    description: d.content,
                    created_at: d.created_at,
                    user_id: d.author_id,
                    author_name: d.author_name,
                    type: 'discussion'
                }));
            }
            if (dError) console.error("Error fetching discussions:", dError);
        }

        // 3. Merge & Sort
        const combined = [...portfolios, ...discussions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setItems(combined);
        setIsLoading(false);
    };

    const extractFirstMedia = (markdown: string): { type: 'image' | 'video', url: string } | null => {
        const imageMatch = markdown.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch) return { type: 'image', url: imageMatch[1] };
        const videoMatch = markdown.match(/\[.*?\]\((.*?\.(?:mp4|webm|ogg|mov))\)/i);
        if (videoMatch) return { type: 'video', url: videoMatch[1] };
        return null;
    };

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
                    <Globe className="w-4 h-4 inline" />
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

    const getAuthorName = () => {
        return currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || '사용자';
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'html') => {
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
                : type === 'video'
                    ? `\n[동영상 보기](${publicUrl})\n`
                    : `\n[HTML 프로젝트 보기](${publicUrl})\n`;

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

    const handleDelete = async (e: React.MouseEvent, item: UnifiedItem) => {
        e.stopPropagation();
        if (!confirm("정말 삭제하시겠습니까?")) return;
        const table = item.type === 'discussion' ? 'discussions' : 'portfolios';
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', item.id);
        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            fetchPortfolios();
        }
    };

    const openEditModal = (e: React.MouseEvent, item: UnifiedItem) => {
        e.stopPropagation();
        if (item.type === 'discussion') {
            alert("질문/토론 수정은 '질문/토론' 메뉴에서 가능합니다.");
            return;
        }
        setEditingId(item.id);
        setFormData({
            title: item.title,
            description: item.description,
            project_url: item.project_url || "",
            topic_id: item.topic_id || ""
        });
        setIsModalOpen(true);
    };

    const openCreateModal = (type: 'topic' | 'project') => {
        if (!currentUser) return alert("로그인이 필요합니다.");
        setEditingId(null);
        setFormData({ title: "", description: "", project_url: "", topic_id: "" });
        setIsTopicModal(type === 'topic');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsTopicModal(false);
        setEditingId(null);
        setFormData({ title: "", description: "", project_url: "", topic_id: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return alert("로그인이 필요합니다.");

        // Topic Creation Logic
        if (isTopicModal) {
            if (!formData.title.trim()) return alert("주제 제목을 입력해주세요.");

            try {
                const { error } = await supabase
                    .from('portfolio_topics')
                    .insert([{
                        title: formData.title,
                        description: formData.description
                    }]);

                if (error) throw error;
                alert("과제(주제)가 등록되었습니다.");
                closeModal();
                fetchPortfolios();
            } catch (error: any) {
                alert("등록 실패: " + error.message);
            }
            return;
        }

        // Project Creation Logic
        if (!formData.description.trim()) return;

        const generatedTitle = formData.description.length > 20
            ? formData.description.substring(0, 20) + "..."
            : formData.description;

        const authorName = getAuthorName();

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('portfolios')
                    .update({
                        description: formData.description,
                        project_url: formData.project_url,
                        topic_id: formData.topic_id || null
                    })
                    .eq('id', editingId);

                if (error) throw error;
                alert("수정되었습니다.");
            } else {
                const { error } = await supabase
                    .from('portfolios')
                    .insert([{
                        title: generatedTitle,
                        description: formData.description,
                        project_url: formData.project_url,
                        user_id: currentUser.id,
                        author_name: authorName,
                        topic_id: formData.topic_id || null
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

    const isOwner = (item: UnifiedItem) => {
        return currentUser && currentUser.id === item.user_id;
    };

    const renderCard = (item: UnifiedItem) => {
        const firstMedia = extractFirstMedia(item.description);
        const isDiscussion = item.type === 'discussion';

        return (
            <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-xl border hover:shadow-lg transition-all group flex flex-col h-full cursor-pointer overflow-hidden ${isDiscussion ? 'border-l-4 border-l-green-500' : ''}`}
            >
                <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`${isDiscussion ? 'bg-green-100' : 'bg-blue-100'} p-1.5 rounded-full`}>
                                {isDiscussion ? (
                                    <Users className={`w-4 h-4 ${isDiscussion ? 'text-green-600' : 'text-blue-600'}`} />
                                ) : (
                                    <User className="w-4 h-4 text-blue-600" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
                                    {item.title || item.author_name}
                                </h3>
                                <span className={`text-xs px-1.5 py-0.5 rounded w-fit ${isDiscussion ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isDiscussion ? '질문/토론' : '프로젝트'}
                                </span>
                            </div>
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
                                    onClick={(e) => handleDelete(e, item)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 mb-4 h-48 bg-gray-50 rounded-lg overflow-hidden relative flex items-center justify-center">
                        {firstMedia && !isDiscussion ? (
                            firstMedia.type === 'video' ? (
                                <video
                                    src={firstMedia.url}
                                    className="w-full h-full object-cover"
                                    muted
                                    onMouseOver={e => (e.target as HTMLVideoElement).play()}
                                    onMouseOut={e => (e.target as HTMLVideoElement).pause()}
                                />
                            ) : (
                                <img
                                    src={firstMedia.url}
                                    alt="Project Preview"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                />
                            )
                        ) : (
                            <div className="w-full h-full p-4 overflow-hidden text-sm text-gray-500 prose-sm prose-p:my-0">
                                <div className="line-clamp-[8] break-words whitespace-pre-wrap">
                                    {item.description}
                                </div>
                            </div>
                        )}
                        {firstMedia?.type === 'video' && !isDiscussion && (
                            <div className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                            {item.author_name || "익명"}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const showInstructorSidebar = userRole === 'instructor' && isMyView;
    const pageTitle = isMyView
        ? "나의 포트폴리오"
        : (userRole === 'instructor' && selectedStudentId
            ? `${students.find(s => s.id === selectedStudentId)?.name || '학습자'}의 포트폴리오`
            : "실습 과제");

    const pageDescription = isMyView
        ? "내가 작성한 프로젝트들을 모아보세요."
        : "학습한 결과물을 공유하고 서로 피드백을 주고받으세요.";

    return (
        <div className="max-w-7xl mx-auto pb-20 flex min-h-[calc(100vh-4rem)]">
            {showInstructorSidebar && (
                <div className="w-64 border-r bg-white flex flex-col h-full sticky top-0 overflow-y-auto hidden lg:flex">
                    <div className="p-4 border-b">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            학습자 목록
                        </h2>
                    </div>
                    <div className="flex-1 p-2 space-y-1">
                        <button
                            onClick={() => setSelectedStudentId(null)}
                            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!selectedStudentId ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            내 활동 내역 (강사)
                        </button>
                        {students.map(student => (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${selectedStudentId === student.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                {student.name || student.email}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {pageTitle}
                        </h1>
                        <p className="text-gray-500 mt-2">
                            {pageDescription}
                        </p>
                    </div>

                    {!isMyView && (
                        <div className="flex gap-3">
                            {userRole === 'instructor' && (
                                <button
                                    onClick={() => openCreateModal('topic')}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                                >
                                    <Plus className="w-5 h-5" />
                                    과제 추가
                                </button>
                            )}

                            <button
                                onClick={() => openCreateModal('project')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                            >
                                <Plus className="w-5 h-5" />
                                프로젝트 추가
                            </button>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed p-12 text-center text-gray-500">
                        <User className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                        {selectedStudentId
                            ? "이 학습자의 프로젝트가 없습니다."
                            : "등록된 프로젝트가 없습니다. + 프로젝트 추가를 눌러 만들어보세요!"
                        }
                    </div>
                ) : isMyView ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => renderCard(item))}
                    </div>
                ) : (
                    <div className="space-y-12">
                        {topics.map(topic => {
                            const topicItems = items.filter(item => item.topic_id === topic.id);

                            return (
                                <section key={topic.id} className="space-y-6">
                                    <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 rounded-xl shadow-md flex justify-between items-center">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">{topic.title}</h2>
                                            {topic.description && <p className="text-green-50 text-sm mt-1">{topic.description}</p>}
                                        </div>
                                    </div>
                                    {topicItems.length > 0 ? (
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {topicItems.map(item => renderCard(item))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            아직 제출된 과제가 없습니다.
                                        </div>
                                    )}
                                </section>
                            );
                        })}

                        {(() => {
                            const uncategorizedItems = items.filter(item => !item.topic_id && item.type === 'portfolio');
                            if (uncategorizedItems.length === 0) return null;

                            return (
                                <section className="space-y-6">
                                    <div className="bg-white px-6 py-4 rounded-xl border-l-4 border-gray-400 shadow-sm">
                                        <h2 className="text-xl font-bold text-gray-700">자유 프로젝트 (미분류)</h2>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {uncategorizedItems.map(item => renderCard(item))}
                                    </div>
                                </section>
                            );
                        })()}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {isTopicModal
                                    ? "새 과제(주제) 등록"
                                    : (editingId ? "프로젝트 수정" : "새 프로젝트 추가")}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!isTopicModal && (
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
                            )}

                            {isTopicModal ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">과제 주제</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="과제 주제를 입력하세요 (예: 1주차 - AI 윤리)"
                                        required
                                    />
                                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">설명 (선택)</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full h-24 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="이 주제에 대한 간단한 설명을 입력하세요."
                                    />
                                </div>
                            ) : (
                                <>
                                    {!isMyView && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">주제 선택 (선택사항)</label>
                                            <select
                                                value={formData.topic_id}
                                                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                <option value="">자유 프로젝트 (미분류)</option>
                                                {topics.map(topic => (
                                                    <option key={topic.id} value={topic.id}>
                                                        {topic.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full h-40 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-base"
                                            placeholder="프로젝트에 대해 설명해주세요..."
                                            required
                                        />

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
                                            <button
                                                type="button"
                                                onClick={() => htmlInputRef.current?.click()}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
                                                title="HTML 파일 추가"
                                            >
                                                <FileCode className="w-5 h-5" />
                                                {isUploading && <span className="absolute top-0 right-0 w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>}
                                            </button>

                                            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                                            <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} />
                                            <input type="file" ref={htmlInputRef} className="hidden" accept=".html,text/html" onChange={(e) => handleFileUpload(e, 'html')} />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium" disabled={isUploading}>취소</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50" disabled={isUploading}>
                                    {isUploading ? "업로드 중..." : (editingId ? "수정하기" : "등록하기")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b">
                            <div className="flex items-center gap-3">
                                <div className={`${selectedItem.type === 'discussion' ? 'bg-green-100' : 'bg-blue-100'} p-2 rounded-full`}>
                                    {selectedItem.type === 'discussion' ? (
                                        <Users className={`w-6 h-6 ${selectedItem.type === 'discussion' ? 'text-green-600' : 'text-blue-600'}`} />
                                    ) : (
                                        <User className="w-6 h-6 text-blue-600" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedItem.author_name || "익명 사용자"}</h2>
                                    <p className="text-sm text-gray-500">{new Date(selectedItem.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="prose prose-blue max-w-none prose-img:rounded-xl prose-img:w-full prose-headings:font-bold prose-a:text-blue-600">
                                <ReactMarkdown components={MarkdownComponents}>{selectedItem.description}</ReactMarkdown>
                            </div>
                            {selectedItem.project_url && (
                                <div className="mt-8 pt-4 border-t">
                                    <a href={selectedItem.project_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium">
                                        <Globe className="w-5 h-5" />
                                        프로젝트 페이지 방문하기
                                    </a>
                                </div>
                            )}
                        </div>
                        {isOwner(selectedItem) && (
                            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
                                {selectedItem.type === 'portfolio' && (
                                    <button onClick={(e) => { setSelectedItem(null); openEditModal(e, selectedItem); }} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium flex items-center gap-2">
                                        <Pencil className="w-4 h-4" /> 수정
                                    </button>
                                )}
                                <button onClick={(e) => { setSelectedItem(null); handleDelete(e, selectedItem); }} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> 삭제
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PortfolioPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
            <PortfolioContent />
        </Suspense>
    );
}
