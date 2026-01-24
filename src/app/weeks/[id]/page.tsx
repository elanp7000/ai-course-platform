export default async function WeekDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-gray-900">{id}주차 학습</h1>
                <p className="text-gray-500">이번 주의 학습 목표와 설명이 들어갑니다.</p>
            </div>

            <div className="grid gap-8">
                <section className="bg-white rounded-xl border p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        📚 강의 자료
                    </h2>
                    <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                        등록된 자료가 없습니다.
                    </div>
                </section>

                <section className="bg-white rounded-xl border p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        🧪 실습 과제
                    </h2>
                    <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                        등록된 과제가 없습니다.
                    </div>
                </section>
            </div>
        </div>
    );
}
