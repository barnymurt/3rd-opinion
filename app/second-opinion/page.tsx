'use client';

import { useState, useEffect } from 'react';

interface Opinion {
  id: string;
  aiResponse: string;
  opinion: {
    summary: string[];
    alternativePerspectives: string;
    assumptions: string;
    considerations: string;
  };
  platform: string;
  createdAt: string;
}

export default function SecondOpinionDashboard() {
  const [opinions, setOpinions] = useState<Opinion[]>([]);
  const [credits, setCredits] = useState(20);
  const [tier, setTier] = useState('free');
  const [selectedOpinion, setSelectedOpinion] = useState<Opinion | null>(null);

  useEffect(() => {
    fetchOpinions();
  }, []);

  const fetchOpinions = async () => {
    try {
      const response = await fetch('/api/second-opinion');
      const data = await response.json();
      if (data.opinions) {
        setOpinions(data.opinions);
      }
    } catch (error) {
      console.error('Failed to fetch opinions:', error);
    }
  };

  const textColor = 'text-gray-900';
  const mutedColor = 'text-gray-600';
  const cardBg = 'bg-white';
  const cardBorder = 'border-gray-200';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h1 className={`${textColor} font-semibold text-lg`}>Second Opinion</h1>
                <p className={`${mutedColor} text-sm`}>Balance AI's tendency to agree with you</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`${mutedColor} text-xs`}>Credits remaining</p>
                <p className={`${textColor} font-bold text-xl`}>{credits} <span className="text-sm font-normal text-gray-500">/ month</span></p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className={`${cardBg} ${cardBorder} rounded-xl border p-6 shadow-sm`}>
            <p className={`${mutedColor} text-sm`}>Total Opinions</p>
            <p className={`${textColor} text-3xl font-bold`}>{opinions.length}</p>
          </div>
          <div className={`${cardBg} ${cardBorder} rounded-xl border p-6 shadow-sm`}>
            <p className={`${mutedColor} text-sm`}>This Month</p>
            <p className={`${textColor} text-3xl font-bold`}>{opinions.length}</p>
          </div>
          <div className={`${cardBg} ${cardBorder} rounded-xl border p-6 shadow-sm`}>
            <p className={`${mutedColor} text-sm`}>Current Plan</p>
            <p className={`${textColor} text-3xl font-bold capitalize`}>{tier}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Opinion History */}
          <div className="col-span-2">
            <div className={`${cardBg} ${cardBorder} rounded-xl border shadow-sm`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className={`${textColor} font-semibold`}>Recent Opinions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {opinions.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className={`${mutedColor}`}>No opinions yet</p>
                    <p className={`${mutedColor} text-sm`}>Use the extension to get your first second opinion</p>
                  </div>
                ) : (
                  opinions.slice(0, 10).map((opinion) => (
                    <button
                      key={opinion.id}
                      onClick={() => setSelectedOpinion(opinion)}
                      className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`${textColor} text-sm font-medium truncate`}>
                            {opinion.aiResponse.substring(0, 80)}...
                          </p>
                          <p className={`${mutedColor} text-xs mt-1`}>
                            {new Date(opinion.createdAt).toLocaleDateString()} · {opinion.platform}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`${textColor} font-semibold mb-4`}>How It Works</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <p className={`${textColor} text-sm font-medium`}>Long Chat Session</p>
                    <p className={`${mutedColor} text-xs`}>Use AI for 7+ mins with few messages</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <p className={`${textColor} text-sm font-medium`}>Get Prompted</p>
                    <p className={`${mutedColor} text-xs`}>See the balanced perspective offer</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <p className={`${textColor} text-sm font-medium`}>View Alternative</p>
                    <p className={`${mutedColor} text-xs`}>Get bullet points + detailed analysis</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${cardBg} ${cardBorder} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`${textColor} font-semibold mb-4`}>Pro Features</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={mutedColor}>100 opinions/month</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={mutedColor}>Multiple AI perspectives</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={mutedColor}>Text-to-speech</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={mutedColor}>History & saves</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Opinion Detail Modal */}
      {selectedOpinion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className={`${textColor} text-xl font-semibold`}>Second Opinion</h2>
                <button
                  onClick={() => setSelectedOpinion(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className={`${textColor} font-medium mb-3`}>Quick Summary</h3>
                <ul className="space-y-2">
                  {selectedOpinion.opinion.summary.map((point, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-purple-600">•</span>
                      <span className={`${mutedColor} text-sm`}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mb-6">
                <h3 className={`${textColor} font-medium mb-3`}>Alternative Perspectives</h3>
                <p className={`${mutedColor} text-sm leading-relaxed`}>{selectedOpinion.opinion.alternativePerspectives}</p>
              </div>
              <div className="mb-6">
                <h3 className={`${textColor} font-medium mb-3`}>Assumptions to Consider</h3>
                <p className={`${mutedColor} text-sm leading-relaxed`}>{selectedOpinion.opinion.assumptions}</p>
              </div>
              <div>
                <h3 className={`${textColor} font-medium mb-3`}>Additional Considerations</h3>
                <p className={`${mutedColor} text-sm leading-relaxed`}>{selectedOpinion.opinion.considerations}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
