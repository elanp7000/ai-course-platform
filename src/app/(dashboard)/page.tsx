import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle } from "lucide-react";

export default function DashboardPage() {
    const weeks = Array.from({ length: 16 }, (_, i) => ({
        id: i + 1,
        title: `${i + 1}주차 학습`,
        description: "NotebookLM과 AI 도구 활용법",
        status: i < 2 ? "completed" : i === 2 ? "in-progress" : "locked",
    }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">내 학습 대시보드</h1>
                    <p className="text-gray-500">16주간의 AI 여정을 시작해보세요.</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">진행률</div>
                    <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-[15%] h-full bg-blue-600 rounded-full" />
                        </div>
                        <span className="font-bold text-blue-600">15%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {weeks.map((week) => (
                    <WeekCard key={week.id} week={week} />
                ))}
            </div>
        </div>
    );
}

function WeekCard({ week }: { week: any }) {
    const isLocked = week.status === "locked";

    return (
        <Link
            href={isLocked ? "#" : `/weeks/${week.id}`}
            className={`block p-6 bg-white rounded-xl border transition-all ${isLocked
                    ? "opacity-60 cursor-not-allowed bg-gray-50"
                    : "hover:shadow-lg hover:border-blue-200 cursor-pointer"
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${week.status === "completed" ? "bg-green-100 text-green-600" :
                        week.status === "in-progress" ? "bg-blue-100 text-blue-600" :
                            "bg-gray-100 text-gray-400"
                    }`}>
                    {week.status === "completed" ? <CheckCircle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium text-gray-400">Week {week.id}</span>
            </div>

            <h3 className="font-bold text-lg mb-1">{week.title}</h3>
            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{week.description}</p>

            {!isLocked && (
                <div className="flex items-center text-blue-600 text-sm font-medium">
                    학습하러 가기 <ArrowRight className="w-4 h-4 ml-1" />
                </div>
            )}
        </Link>
    );
}
