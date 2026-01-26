import Link from "next/link";
import { BookOpen, Home, List, MessageCircle, Settings, User } from "lucide-react";

export function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r h-full flex flex-col hidden md:flex">
            <Link href="/" className="h-16 px-6 border-b flex items-center gap-2 hover:bg-gray-50 transition-colors">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <span className="font-bold text-xl text-gray-800">AI Course</span>
            </Link>

            <nav className="flex-1 p-4 space-y-1">
                <NavItem href="/dashboard" icon={Home} label="대시보드" />
                <NavItem href="/notices" icon={List} label="공지사항" />
                <NavItem href="/discussions" icon={MessageCircle} label="질문·토론" />
                <NavItem href="/portfolio" icon={User} label="내 포트폴리오" />
            </nav>

            <div className="p-4 border-t">
                <NavItem href="/settings" icon={Settings} label="설정" />
            </div>
        </aside>
    );
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors">
            <Icon className="w-5 h-5" />
            <span className="font-medium">{label}</span>
        </Link>
    );
}
