import Link from 'next/link';

export default function WeeksPage() {
    const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Weekly Curriculum</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {weeks.map((week) => (
                    <Link
                        key={week}
                        href={`/weeks/${week}`}
                        className="block p-6 bg-white border rounded-xl hover:shadow-md transition-shadow"
                    >
                        <h2 className="text-xl font-bold mb-2">Week {week}</h2>
                        <p className="text-gray-500">Go to Week {week} content</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
