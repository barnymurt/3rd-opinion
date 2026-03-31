'use client';

import { useState, useEffect } from 'react';

interface Opinion {
  id: string;
  aiResponse: string;
  chatName: string;
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
  const [activeTab, setActiveTab] = useState('history');

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

  const creditPercentage = (credits / 20) * 100;

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <header className="bg-white border-bottom" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', borderRadius: 12, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                <svg style={{ width: 24, height: 24, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0 }}>Third Opinion</h1>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Balance AI&apos;s tendency to agree</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-4">
              <div className="text-end">
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Free credits remaining</p>
                <p style={{ fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>{credits} <span style={{ fontSize: 14, fontWeight: 500, color: '#94a3b8' }}>/ month</span></p>
              </div>
              <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="d-flex gap-2 mb-6" style={{ background: '#e2e8f0', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {['history', 'how-it-works', 'pro'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                padding: '10px 20px', 
                border: 'none', 
                background: activeTab === tab ? 'white' : 'transparent', 
                borderRadius: 8, 
                fontSize: 13, 
                fontWeight: 500, 
                color: activeTab === tab ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'history' ? 'History' : tab === 'how-it-works' ? 'How It Works' : 'Pro'}
            </button>
          ))}
        </div>

        {activeTab === 'history' && (
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <div className="bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent Opinions</h2>
              </div>
              <div>
                {opinions.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div className="mx-auto mb-4 d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: '50%' }}>
                      <svg style={{ width: 32, height: 32, color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p style={{ color: '#64748b', margin: 0 }}>No opinions yet</p>
                    <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>Use the extension to get your first second opinion</p>
                  </div>
                ) : (
                  opinions.slice(0, 10).map((opinion) => (
                    <button
                      key={opinion.id}
                      onClick={() => setSelectedOpinion(opinion)}
                      style={{ width: '100%', padding: '16px 20px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="d-flex align-items-start justify-content-between">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#0f172a', fontSize: 14, fontWeight: 600, margin: 0 }}>{opinion.chatName}</p>
                          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {opinion.aiResponse.substring(0, 60)}...
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: 12, margin: '4px 0 0' }}>
                            {new Date(opinion.createdAt).toLocaleDateString()} · {opinion.platform}
                          </p>
                        </div>
                        <svg style={{ width: 20, height: 20, color: '#94a3b8', marginLeft: 8, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="bg-white rounded-2xl" style={{ padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Credit Usage</h3>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${creditPercentage}%`, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)', borderRadius: 4, transition: 'width 0.3s' }}></div>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{20 - credits} of 20 credits used</p>
              </div>

              <div className="bg-white rounded-2xl" style={{ padding: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 16px' }}>Stats</h3>
                <div className="d-flex justify-content-between">
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>{opinions.length}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Total</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>{opinions.length}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>This Month</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>{tier}</p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'how-it-works' && (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="bg-white rounded-2xl" style={{ padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 20px' }}>How It Works</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { num: 1, title: 'Chat with AI', desc: 'Have a conversation for 7+ minutes with few messages' },
                  { num: 2, title: 'Get Prompted', desc: "We'll offer a balanced perspective" },
                  { num: 3, title: 'View Alternative', desc: 'See bullet points + detailed analysis' }
                ].map((step) => (
                  <div key={step.num} className="d-flex gap-3">
                    <div className="d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, background: '#e0e7ff', borderRadius: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>{step.num}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', margin: 0 }}>{step.title}</p>
                      <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl" style={{ padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 20px' }}>Supported Platforms</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((platform) => (
                  <div key={platform} className="d-flex align-items-center gap-2">
                    <svg style={{ width: 16, height: 16, color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontSize: 14, color: '#0f172a' }}>{platform}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pro' && (
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 16, padding: 28, border: 'none', boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)' }}>
              <h3 style={{ color: 'white', fontSize: 22, marginBottom: 8 }}>Upgrade to Pro</h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 20 }}>Unlock unlimited opinions and advanced features</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
                {['100 opinions/month', 'Multiple AI perspectives', 'Text-to-speech', 'History & saves'].map((feature) => (
                  <li key={feature} className="d-flex align-items-center gap-2" style={{ color: 'white', fontSize: 14, padding: '6px 0' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button style={{ width: '100%', padding: 14, background: 'white', color: '#6366f1', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Upgrade for $9/mo
              </button>
            </div>
          </div>
        )}
      </main>

      {selectedOpinion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }} onClick={() => setSelectedOpinion(null)}>
          <div style={{ background: 'white', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center justify-content-between">
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0f172a', margin: 0 }}>Third Opinion</h2>
                <button onClick={() => setSelectedOpinion(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <svg style={{ width: 24, height: 24, color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>Quick Summary</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {selectedOpinion.opinion.summary.map((point, i) => (
                    <li key={i} className="d-flex gap-2" style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 8, fontSize: 14, color: '#475569' }}>
                      <span style={{ color: '#6366f1' }}>•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Alternative Perspectives</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{selectedOpinion.opinion.alternativePerspectives}</p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Assumptions to Consider</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{selectedOpinion.opinion.assumptions}</p>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Additional Considerations</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{selectedOpinion.opinion.considerations}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
