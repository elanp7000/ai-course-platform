"use client";

import { useState } from "react";
import { Folder, FileText, Download, Search } from "lucide-react";

export default function MaterialsPage() {
    // Placeholder data
    const [materials] = useState([
        { id: 1, title: "1주차 강의자료 - AI의 이해", type: "pdf", date: "2024-03-01", size: "2.5MB" },
        { id: 2, title: "실습 환경 설정 가이드", type: "pdf", date: "2024-03-01", size: "1.2MB" },
    ]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">학습 자료</h1>
                    <p className="text-gray-500 mt-2">수업에 필요한 강의 자료와 참고 파일을 확인하세요.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b bg-gray-50/50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="자료 검색..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {materials.map((material) => (
                        <div key={material.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {material.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {material.date} • {material.size}
                                    </p>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    ))}

                    {materials.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            등록된 학습 자료가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
