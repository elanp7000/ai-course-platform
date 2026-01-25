
"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle, Sparkles, Star, Users, Zap } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-500 selection:text-white">
            {/* Header / Nav */}
            <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">AI Course</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                           로그인
                        </Link>
                        <Link href="/login?mode=signup" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-500/20">
                            시작하기
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-30 pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]"></div>
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-300 text-sm font-medium backdrop-blur-sm mb-6 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        AI 마스터 여정을 시작하세요
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-8 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent max-w-4xl mx-auto">
                        AI 도구 활용 능력을 <br /> 완벽하게 마스터하세요
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        ChatGPT부터 Midjourney까지. <br className="md:hidden"/> 실무에 즉시 적용 가능한 AI 기술을 체계적인 커리큘럼으로 배워보세요.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group">
                            무료로 시작하기
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="#features" className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full font-bold text-lg transition-all flex items-center justify-center">
                            커리큘럼 보기
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="mt-20 pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                         {[
                            { label: "수강생", value: "1,200+" },
                            { label: "강의 만족도", value: "4.9/5" },
                            { label: "실습 프로젝트", value: "15+" },
                            { label: "커뮤니티 멤버", value: "3,000+" },
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                                <div className="text-sm text-slate-500">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-950">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">왜 AI Course인가요?</h2>
                        <p className="text-slate-400">단순 이론이 아닌, 실전 중심의 차별화된 학습 경험을 제공합니다.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Zap className="w-6 h-6 text-yellow-400" />,
                                title: "최신 AI 트렌드 반영",
                                desc: "매주 업데이트되는 최신 AI 도구와 기술 트렌드를 가장 빠르게 만나보세요."
                            },
                            {
                                icon: <BookOpen className="w-6 h-6 text-blue-400" />,
                                title: "체계적인 커리큘럼",
                                desc: "기초부터 심화까지, 누구나 따라 할 수 있는 단계별 학습 로드맵을 제공합니다."
                            },
                            {
                                icon: <Users className="w-6 h-6 text-green-400" />,
                                title: "함께 성장하는 커뮤니티",
                                desc: "같은 목표를 가진 동료들과 지식을 공유하고 함께 성장하는 경험을 하세요."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 transition-colors">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

             {/* Footer */}
             <footer className="py-12 border-t border-white/10 bg-slate-900 text-sm text-slate-500">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                         <Sparkles className="w-4 h-4 text-blue-500" />
                         <span className="font-semibold text-slate-300">AI Course Platform</span>
                    </div>
                    <div>
                        &copy; {new Date().getFullYear()} All rights reserved.
                    </div>
                </div>
             </footer>
        </div>
    );
}
