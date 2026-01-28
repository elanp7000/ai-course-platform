"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { Send, Trash2, User } from "lucide-react";

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    author_name?: string;
}

interface CommentSectionProps {
    targetId: string;
    targetType: 'discussion' | 'portfolio';
}

export default function CommentSection({ targetId, targetType }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        checkUser();
        fetchComments();
    }, [targetId]);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setCurrentUser(session.user);
            const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single();
            setUserRole(data?.role || 'student');
        }
    };

    const fetchComments = async () => {
        setIsLoading(true);
        const column = targetType === 'discussion' ? 'discussion_id' : 'portfolio_id';

        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq(column, targetId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching comments:", error);
        } else {
            setComments(data || []);
        }
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return alert("로그인이 필요합니다.");
        if (!newComment.trim()) return;

        const authorName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '사용자';

        const payload: any = {
            user_id: currentUser.id,
            content: newComment,
            author_name: authorName
        };

        if (targetType === 'discussion') payload.discussion_id = targetId;
        else payload.portfolio_id = targetId;

        const { data, error } = await supabase
            .from('comments')
            .insert([payload])
            .select() // Select to get the new ID
            .single();

        if (error) {
            alert("댓글 등록 실패: " + error.message);
        } else {
            setComments([...comments, data]);
            setNewComment("");
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm("정말 삭제하시겠습니까?")) return;

        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            alert("삭제 실패: " + error.message);
        } else {
            setComments(comments.filter(c => c.id !== commentId));
        }
    };

    const canDelete = (comment: Comment) => {
        if (!currentUser) return false;
        return currentUser.id === comment.user_id || userRole === 'instructor';
    };

    return (
        <div className="mt-8 pt-6 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                댓글 <span className="text-blue-600">{comments.length}</span>
            </h3>

            {/* List */}
            <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">아직 댓글이 없습니다. 첫 댓글을 남겨주세요.</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="bg-gray-50 rounded-xl p-4 group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-white p-1 rounded-full border border-gray-200">
                                        <User className="w-3 h-3 text-gray-400" />
                                    </div>
                                    <span className="font-semibold text-sm text-gray-900">{comment.author_name}</span>
                                    <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                                </div>
                                {canDelete(comment) && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="text-gray-700 text-sm whitespace-pre-wrap pl-7">
                                {comment.content}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[80px]"
                    placeholder={currentUser ? "댓글을 입력하세요..." : "로그인이 필요합니다."}
                    disabled={!currentUser}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || !currentUser}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}
