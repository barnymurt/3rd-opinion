// Third Opinion - Popup Script

const API_BASE = 'http://localhost:3000';

// Global function for footer links
window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  const tabContent = document.getElementById('tab-' + tabName);
  if (tabContent) {
    tabContent.style.display = 'block';
    tabContent.classList.add('active');
  }
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector('[data-tab="' + tabName + '"]');
  if (tabBtn) tabBtn.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).style.display = 'block';
    });
  });
  
  // Save API keys
  document.getElementById('saveApiKeys')?.addEventListener('click', () => {
    const apiKeys = {
      anthropic: document.getElementById('api-anthropic')?.value || '',
      openai: document.getElementById('api-openai')?.value || '',
      google: document.getElementById('api-google')?.value || '',
      minimax: document.getElementById('api-minimax')?.value || ''
    };
    chrome.storage.local.set({ apiKeys: apiKeys }, () => {
      alert('API keys saved!');
    });
  });
  
  loadHistory();
  loadDashboard();

  document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    alert('Stripe integration coming soon! Sign up for updates.');
  });

  // Get Third Opinion button
  document.getElementById('getOpinionBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('getOpinionBtn');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    // Check for API keys first
    chrome.storage.local.get(['apiKeys'], (result) => {
      const apiKeys = result.apiKeys || {};
      console.log('API keys from storage:', apiKeys);
      console.log('Has anthropic:', !!apiKeys.anthropic);
      console.log('Has minimax:', !!apiKeys.minimax);
      const hasApiKey = apiKeys.anthropic || apiKeys.minimax;
      
      if (!hasApiKey) {
        alert('No API key found. Please add your API key in the Settings tab.\n\nGet keys from:\n- Anthropic: https://console.anthropic.com/\n- Minimax: https://platform.minimaxi.com/');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      makeApiCallWithKeys(apiKeys, btn);
    });
  });
  
  function makeApiCallWithKeys(apiKeys, btn) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        alert('No active tab found');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      const url = tabs[0].url;
      const urlLower = url.toLowerCase();
      const supported = urlLower.includes('claude.ai') || urlLower.includes('chatgpt.com') || urlLower.includes('chat.openai.com') || urlLower.includes('gemini.google.com') || urlLower.includes('perplexity.ai') || urlLower.includes('minimax.io');
      
      if (!supported) {
        alert('Please open an AI chat page (Claude, ChatGPT, Gemini, Perplexity, or Minimax)');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      const platform = urlLower.includes('claude') ? 'claude' : urlLower.includes('chat') ? 'chatgpt' : urlLower.includes('gemini') ? 'gemini' : urlLower.includes('perplexity') ? 'perplexity' : urlLower.includes('minimax') ? 'minimax' : 'other';
      
      // Get AI response from page via content script
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getAIResponse' }, (response) => {
        console.log('Page response:', response);
        
        if (chrome.runtime.lastError || !response) {
          alert('Could not read chat. Refresh the page and try again.');
          btn.textContent = 'Get Third Opinion';
          btn.disabled = false;
          return;
        }
        
        const aiResponse = response.aiResponse || response.text || '';
        const userQuestion = response.userQuestion || '';
        
        if (!aiResponse || aiResponse.length < 50) {
          alert('No AI response detected. Start a conversation first.');
          btn.textContent = 'Get Third Opinion';
          btn.disabled = false;
          return;
        }
        
        console.log('AI response length:', aiResponse.length);
        console.log('User question:', userQuestion ? userQuestion.substring(0, 100) : 'EMPTY');
        
        // Prioritize minimax key, then anthropic
        const apiKey = apiKeys.minimax || apiKeys.anthropic;
        const provider = apiKeys.minimax ? 'minimax' : 'anthropic';
        
        const requestData = {
          aiResponse: aiResponse.substring(0, 8000),
          userQuestion: userQuestion.substring(0, 1000),
          platform: urlLower.includes('claude') ? 'claude' : urlLower.includes('chat') ? 'chatgpt' : urlLower.includes('gemini') ? 'gemini' : urlLower.includes('perplexity') ? 'perplexity' : urlLower.includes('minimax') ? 'minimax' : 'other',
          url: url,
          chatName: aiResponse.substring(0, 40) + '...',
          apiKey: apiKey,
          provider: provider
        };
        
        console.log('Sending to API:', JSON.stringify(requestData).substring(0, 500));
        
        btn.textContent = 'Analyzing...';
        
        makeApiCall(requestData, btn);
      });
    });
  }

  // Credit check
  chrome.storage.local.get(['creditsUsed', 'creditsResetDate', 'tier'], (result) => {
    const today = new Date().toDateString();
    let creditsUsed = result.creditsUsed || 0;
    let lastReset = result.creditsResetDate || today;
    
    if (lastReset !== today) {
      const lastResetDate = new Date(lastReset);
      const todayDate = new Date(today);
      if (lastResetDate.getMonth() !== todayDate.getMonth()) {
        creditsUsed = 0;
        chrome.storage.local.set({ creditsUsed: 0, creditsResetDate: today });
      }
    }
    
    const creditsRemaining = Math.max(0, 20 - creditsUsed);
    const creditsValue = document.querySelector('.credits-value');
    if (creditsValue) creditsValue.innerHTML = `${creditsRemaining} <span>/ month</span>`;
    
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (progressFill && progressText) {
      progressFill.style.width = (creditsRemaining / 20 * 100) + '%';
      progressText.textContent = creditsRemaining + ' of 20 credits remaining';
    }
  });
});

function makeApiCall(requestData, btn) {
  const safetyTimeout = setTimeout(() => {
    alert('Request timed out. Please try again.');
    btn.textContent = 'Get Third Opinion';
    btn.disabled = false;
  }, 30000);
  
  fetch(API_BASE + '/api/second-opinion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData)
  })
  .then(res => {
    if (!res.ok) throw new Error('Server error: ' + res.status);
    return res.json();
  })
  .then(data => {
    clearTimeout(safetyTimeout);
    console.log('Full API response:', JSON.stringify(data, null, 2));
    
    if (data && data.success) {
      console.log('=== OPINION CONTENT ===');
      console.log('Summary:', data.opinion?.summary);
      console.log('Alt Perspectives:', data.opinion?.alternativePerspectives?.substring(0, 100));
      console.log('Is fallback?:', data.opinion?.alternativePerspectives?.includes('While the response provides useful information'));
      
      showResultInPopup(data.opinion, data.opinion?.summary?.[0] || 'Third Opinion');
      
      chrome.storage.local.get(['creditsUsed', 'stats'], (result) => {
        const stats = result.stats || { total: 0, platformCounts: {} };
        stats.total = (stats.total || 0) + 1;
        stats.platformCounts[requestData.platform] = (stats.platformCounts[requestData.platform] || 0) + 1;
        stats.lastActivity = Date.now();
        
        chrome.storage.local.set({ 
          creditsUsed: (result.creditsUsed || 0) + 1,
          creditsResetDate: new Date().toDateString(),
          stats: stats
        });
        loadDashboard();
      });
    } else {
      alert('Error: ' + (data?.error || 'Failed'));
    }
    btn.textContent = 'Get Third Opinion';
    btn.disabled = false;
  })
  .catch(err => {
    clearTimeout(safetyTimeout);
    alert('Error: ' + err.message);
    btn.textContent = 'Get Third Opinion';
    btn.disabled = false;
  });
}

function showResultInPopup(opinion, chatName) {
  const mainTab = document.getElementById('tab-main');
  if (!mainTab) return;
  
  const summaryHtml = (opinion.summary || []).map(p => `<li style="padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #475569;">• ${p}</li>`).join('');
  
  mainTab.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none;">
      <h3 style="color: white; font-size: 16px; margin-bottom: 4px;">${chatName || 'Third Opinion'}</h3>
      <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Your alternative perspective</p>
    </div>
    <div class="card">
      <h4 style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 12px;">Quick Summary</h4>
      <ul style="list-style: none; padding: 0; margin: 0 0 16px;">${summaryHtml}</ul>
      <h4 style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Alternative Perspectives</h4>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 12px;">${opinion.alternativePerspectives || ''}</p>
      <h4 style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Assumptions</h4>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 12px;">${opinion.assumptions || ''}</p>
      <h4 style="font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Considerations</h4>
      <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">${opinion.considerations || ''}</p>
    </div>
    <button class="btn btn-secondary" onclick="location.reload()" style="margin-top: 8px;">Start New Opinion</button>
  `;
}

function loadSettings() {
  chrome.storage.local.get(['apiKeys', 'prefAutoPrompt', 'prefTTS', 'prefSound'], (result) => {
    if (result.apiKeys) {
      if (document.getElementById('api-anthropic')) document.getElementById('api-anthropic').value = result.apiKeys.anthropic || '';
      if (document.getElementById('api-openai')) document.getElementById('api-openai').value = result.apiKeys.openai || '';
      if (document.getElementById('api-google')) document.getElementById('api-google').value = result.apiKeys.google || '';
      if (document.getElementById('api-minimax')) document.getElementById('api-minimax').value = result.apiKeys.minimax || '';
    }
    if (document.getElementById('pref-auto-prompt')) document.getElementById('pref-auto-prompt').checked = result.prefAutoPrompt !== false;
    if (document.getElementById('pref-tts')) document.getElementById('pref-tts').checked = result.prefTTS !== false;
    if (document.getElementById('pref-sound')) document.getElementById('pref-sound').checked = result.prefSound === true;
  });
}

function loadDashboard() {
  chrome.storage.local.get(['creditsUsed', 'tier', 'stats'], (result) => {
    const creditsUsed = result.creditsUsed || 0;
    const creditsRemaining = Math.max(0, 20 - creditsUsed);
    const tier = result.tier || 'free';
    const stats = result.stats || { total: 0, platformCounts: {} };
    
    const progressFill = document.getElementById('dashboard-progress');
    const creditsText = document.getElementById('dashboard-credits');
    if (progressFill) progressFill.style.width = (creditsRemaining / 20 * 100) + '%';
    if (creditsText) creditsText.textContent = creditsRemaining + ' of 20 credits remaining';
    
    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = stats.total || 0;
    if (document.getElementById('stat-week')) document.getElementById('stat-week').textContent = Math.ceil((stats.total || 0) / 7);
    if (document.getElementById('stat-plan')) document.getElementById('stat-plan').textContent = tier === 'pro' ? 'Pro' : 'Free';
    if (document.getElementById('stat-streak')) document.getElementById('stat-streak').textContent = stats.streak || 0;
    
    const platformBreakdown = document.getElementById('platform-breakdown');
    if (platformBreakdown) {
      const c = stats.platformCounts || {};
      platformBreakdown.innerHTML = `
        <span style="padding: 4px 12px; background: #e0e7ff; color: #6366f1; border-radius: 20px; font-size: 12px;">ChatGPT: ${c.chatgpt || 0}</span>
        <span style="padding: 4px 12px; background: #fef3c7; color: #d97706; border-radius: 20px; font-size: 12px;">Claude: ${c.claude || 0}</span>
        <span style="padding: 4px 12px; background: #d1fae5; color: #059669; border-radius: 20px; font-size: 12px;">Gemini: ${c.gemini || 0}</span>
      `;
    }
    
    const lastActivity = document.getElementById('last-activity');
    if (lastActivity && stats.lastActivity) {
      const days = Math.floor((Date.now() - stats.lastActivity) / (1000 * 60 * 60 * 24));
      lastActivity.textContent = days === 0 ? 'Last opinion: Today' : 'Last opinion: ' + days + ' days ago';
    }
  });
}

function loadHistory() {
  fetch(API_BASE + '/api/second-opinion')
    .then(res => res.json())
    .then(data => {
      const historyList = document.getElementById('history-list');
      if (!historyList || !data.opinions || data.opinions.length === 0) return;
      
      historyList.innerHTML = data.opinions.slice(0, 10).map((opinion, index) => `
        <div style="border-bottom: 1px solid #e2e8f0;">
          <div style="padding: 14px 18px; cursor: pointer;" onclick="toggleHistoryItem(${index})">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="flex:1;">
                <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0;">${opinion.chatName || 'Untitled Chat'}</p>
                <p style="font-size: 12px; color: #64748b; margin: 4px 0 0;">${new Date(opinion.createdAt).toLocaleDateString()} · ${opinion.platform}</p>
              </div>
              <span id="history-arrow-${index}" style="color:#94a3b8; font-size:18px;">+</span>
            </div>
          </div>
          <div id="history-detail-${index}" style="display:none; padding: 0 18px 14px; background:#f8fafc;">
            <p style="font-size:13px; color:#64748b; margin-bottom:8px;"><strong>AI Response:</strong> ${(opinion.aiResponse || '').substring(0, 150)}...</p>
            <button onclick="viewOpinion('${opinion.id}')" style="padding:8px 16px; background:#6366f1; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">View Full Opinion</button>
          </div>
        </div>
      `).join('');
    })
    .catch(err => console.error('Failed to load history:', err));
}

window.toggleHistoryItem = function(index) {
  const detail = document.getElementById('history-detail-' + index);
  const arrow = document.getElementById('history-arrow-' + index);
  if (detail.style.display === 'none') {
    detail.style.display = 'block';
    arrow.textContent = '-';
  } else {
    detail.style.display = 'none';
    arrow.textContent = '+';
  }
};

function viewOpinion(id) {
  fetch(API_BASE + '/api/second-opinion')
    .then(res => res.json())
    .then(data => {
      const opinion = data.opinions?.find(o => o.id === id);
      if (!opinion) return;
      
      const summaryHtml = (opinion.opinion?.summary || []).map(p => `<li style="padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px; font-size: 13px; color: #475569;">• ${p}</li>`).join('');
      
      const panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;';
      panel.innerHTML = `
        <div style="background:white;border-radius:14px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:16px;font-weight:600;">${opinion.chatName || 'Third Opinion'}</span>
            <button onclick="this.closest('[style*=\\"position:fixed\\"]').remove()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;padding:0;line-height:1;opacity:0.8;">&times;</button>
          </div>
          <div style="padding:20px;">
            <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 12px;">Quick Summary</h4>
            <ul style="list-style:none;padding:0;margin:0 0 20px;">${summaryHtml}</ul>
            <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Alternative Perspectives</h4>
            <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">${opinion.opinion?.alternativePerspectives || ''}</p>
            <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Assumptions</h4>
            <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">${opinion.opinion?.assumptions || ''}</p>
            <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Considerations</h4>
            <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">${opinion.opinion?.considerations || ''}</p>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
    });
}
