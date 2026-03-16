// Popup script for Second Opinion extension

// Global function for footer links
window.switchTab = function(tabName) {
  // Hide all tab content
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-content.tab-content').forEach(c => c.classList.remove('active'));
  
  // Show selected tab
  const tabContent = document.getElementById('tab-' + tabName);
  if (tabContent) {
    tabContent.style.display = 'block';
    tabContent.classList.add('active');
  }
  
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabBtn = document.querySelector('[data-tab="' + tabName + '"]');
  if (tabBtn) {
    tabBtn.classList.add('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
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
  
  // Save API keys button
  document.getElementById('saveApiKeys')?.addEventListener('click', () => {
    const apiKeys = {
      anthropic: document.getElementById('api-anthropic')?.value || '',
      openai: document.getElementById('api-openai')?.value || '',
      google: document.getElementById('api-google')?.value || ''
    };
    chrome.storage.local.set({ apiKeys: apiKeys }, () => {
      alert('API keys saved!');
    });
  });
  
  // Preferences checkboxes
  document.getElementById('pref-auto-prompt')?.addEventListener('change', (e) => {
    chrome.storage.local.set({ prefAutoPrompt: e.target.checked });
  });
  document.getElementById('pref-tts')?.addEventListener('change', (e) => {
    chrome.storage.local.set({ prefTTS: e.target.checked });
  });
  document.getElementById('pref-sound')?.addEventListener('change', (e) => {
    chrome.storage.local.set({ prefSound: e.target.checked });
  });
  
  loadHistory();
  loadDashboard();

  chrome.storage.local.get(['creditsUsed', 'creditsResetDate', 'tier'], (result) => {
    const today = new Date().toDateString();
    let creditsUsed = result.creditsUsed || 0;
    let lastReset = result.creditsResetDate || today;
    
    // Reset credits if new month
    if (lastReset !== today) {
      const lastResetDate = new Date(lastReset);
      const todayDate = new Date(today);
      if (lastResetDate.getMonth() !== todayDate.getMonth()) {
        creditsUsed = 0;
        chrome.storage.local.set({ creditsUsed: 0, creditsResetDate: today });
      }
    }
    
    const creditsRemaining = Math.max(0, 20 - creditsUsed);
    const tier = result.tier || 'free';
    
    const creditsValue = document.querySelector('.credits-value');
    if (creditsValue) {
      creditsValue.innerHTML = `${creditsRemaining} <span>/ month</span>`;
    }

    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (progressFill && progressText) {
      const percentage = (creditsRemaining / 20) * 100;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${creditsRemaining} of 20 credits remaining`;
    }

    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
      if (tier === 'pro') {
        statusBadge.textContent = 'Pro';
        statusBadge.style.background = '#d1fae5';
        statusBadge.style.color = '#059669';
      }
    }

    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn && tier === 'pro') {
      upgradeBtn.textContent = 'Manage Subscription';
    }
  });

  loadHistory();
  loadDashboard();

  document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    alert('Stripe integration coming soon! Sign up for updates.');
  });

  document.getElementById('dashboardLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Switch to dashboard tab instead
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="dashboard"]').classList.add('active');
    document.getElementById('tab-dashboard').classList.add('active');
  });

  document.getElementById('getOpinionBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('getOpinionBtn');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    let errorShown = false;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        alert('No active tab found');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      const url = tabs[0].url;
      console.log('Tab URL:', url);
      
      // Check if on supported platform
      const urlLower = url.toLowerCase();
      const supported = urlLower.includes('claude.ai') || 
                       urlLower.includes('chatgpt.com') || 
                       urlLower.includes('chat.openai.com') || 
                       urlLower.includes('gemini.google.com') || 
                       urlLower.includes('perplexity.ai') ||
                       urlLower.includes('ai.google') ||
                       urlLower.includes('you.com');
      if (!supported) {
        alert('Please open an AI chat page (Claude, ChatGPT, Gemini, or Perplexity) to get a second opinion.\n\nCurrent URL: ' + url);
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      // Try messaging the content script first
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFullPageText' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script error:', chrome.runtime.lastError.message);
          // Try to reload the content script
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => document.body.innerText
          }, (results) => {
            handlePageText(results?.[0]?.result || '', url, btn);
          });
        } else if (response && response.text) {
          handlePageText(response.text, url, btn);
        } else {
          alert('Could not read the chat page. Try refreshing the page and clicking again.');
          btn.textContent = 'Get Third Opinion';
          btn.disabled = false;
        }
      });
    });
    
    function handlePageText(text, url, btn) {
      console.log('Page text length:', text.length);
      
      if (!text || text.length < 100) {
        alert('The chat page appears empty. Start a conversation with AI first.');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        return;
      }
      
      btn.textContent = 'Analyzing...';
      
      const urlLower = url.toLowerCase();
      const requestData = {
        aiResponse: text.substring(0, 8000),
        platform: urlLower.includes('claude') ? 'claude' : urlLower.includes('chat') ? 'chatgpt' : urlLower.includes('gemini') ? 'gemini' : urlLower.includes('perplexity') ? 'perplexity' : 'other',
        url: url,
        chatName: text.substring(0, 40) + '...'
      };
      
      // ALWAYS reset button after 30 seconds (safety timeout)
      const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout reached, resetting button');
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
        alert('Request timed out. Please try again.');
      }, 30000);
      
      // Try content script to make API call (most reliable)
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CALL_API', data: requestData }, (response) => {
        clearTimeout(safetyTimeout);
        
        if (response && response.success) {
          showResultInPopup(response.opinion, response.opinion?.summary?.[0] || 'Third Opinion');
          
          // Update credits and stats
          chrome.storage.local.get(['creditsUsed', 'stats', 'platform'], (result) => {
            const newCreditsUsed = (result.creditsUsed || 0) + 1;
            const stats = result.stats || { total: 0, platformCounts: {}, lastActivity: null };
            
            const platform = requestData.platform;
            stats.platformCounts[platform] = (stats.platformCounts[platform] || 0) + 1;
            stats.total = (stats.total || 0) + 1;
            stats.lastActivity = Date.now();
            
            chrome.storage.local.set({ 
              creditsUsed: newCreditsUsed,
              creditsResetDate: new Date().toDateString(),
              stats: stats
            });
            
            loadDashboard();
          });
        } else {
          alert('Error: ' + (response?.error || 'Failed to get third opinion'));
        }
        
        btn.textContent = 'Get Third Opinion';
        btn.disabled = false;
      });
    }
  });
});

function showResultInPopup(opinion, chatName) {
  const mainTab = document.getElementById('tab-main');
  if (!mainTab) return;
  
  const summaryHtml = (opinion.summary || []).map(p => `<li style="padding: 10px 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; font-size: 13px; color: #475569;">• ${p}</li>`).join('');
  
  mainTab.innerHTML = `
    <div class="card" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border: none;">
      <h3 style="color: white; font-size: 16px; margin-bottom: 4px;">${chatName || 'Second Opinion'}</h3>
      <p style="color: rgba(255,255,255,0.8); font-size: 12px;">Here is your balanced perspective</p>
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
    }
    if (document.getElementById('pref-auto-prompt')) document.getElementById('pref-auto-prompt').checked = result.prefAutoPrompt !== false;
    if (document.getElementById('pref-tts')) document.getElementById('pref-tts').checked = result.prefTTS !== false;
    if (document.getElementById('pref-sound')) document.getElementById('pref-sound').checked = result.prefSound === true;
  });
}

function loadDashboard() {
  chrome.storage.local.get(['creditsUsed', 'creditsResetDate', 'tier', 'stats'], (result) => {
    const creditsUsed = result.creditsUsed || 0;
    const creditsRemaining = Math.max(0, 20 - creditsUsed);
    const tier = result.tier || 'free';
    const stats = result.stats || { total: 0, platformCounts: {}, lastActivity: null };
    
    // Update credit progress
    const progressFill = document.getElementById('dashboard-progress');
    const creditsText = document.getElementById('dashboard-credits');
    if (progressFill && creditsText) {
      const percentage = (creditsRemaining / 20) * 100;
      progressFill.style.width = percentage + '%';
      creditsText.textContent = creditsRemaining + ' of 20 credits remaining';
    }
    
    // Update stats
    const statTotal = document.getElementById('stat-total');
    const statWeek = document.getElementById('stat-week');
    const statPlan = document.getElementById('stat-plan');
    const statStreak = document.getElementById('stat-streak');
    
    if (statTotal) statTotal.textContent = stats.total || 0;
    if (statWeek) statWeek.textContent = Math.ceil((stats.total || 0) / 7) || 0;
    if (statPlan) statPlan.textContent = tier === 'pro' ? 'Pro' : 'Free';
    if (statStreak) statStreak.textContent = stats.streak || 0;
    
    // Update platform breakdown
    const platformBreakdown = document.getElementById('platform-breakdown');
    if (platformBreakdown) {
      const counts = stats.platformCounts || {};
      platformBreakdown.innerHTML = `
        <span style="padding: 4px 12px; background: #e0e7ff; color: #6366f1; border-radius: 20px; font-size: 12px;">ChatGPT: ${counts.chatgpt || 0}</span>
        <span style="padding: 4px 12px; background: #fef3c7; color: #d97706; border-radius: 20px; font-size: 12px;">Claude: ${counts.claude || 0}</span>
        <span style="padding: 4px 12px; background: #d1fae5; color: #059669; border-radius: 20px; font-size: 12px;">Gemini: ${counts.gemini || 0}</span>
      `;
    }
    
    // Update last activity
    const lastActivity = document.getElementById('last-activity');
    if (lastActivity) {
      if (stats.lastActivity) {
        const days = Math.floor((Date.now() - stats.lastActivity) / (1000 * 60 * 60 * 24));
        lastActivity.textContent = days === 0 ? 'Last opinion: Today' : 'Last opinion: ' + days + ' days ago';
      } else {
        lastActivity.textContent = 'Last opinion: Never';
      }
    }
  });
}

function loadHistory() {
  chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
    if (response && response.opinions && response.opinions.length > 0) {
      const historyList = document.getElementById('history-list');
      if (!historyList) return;
      
      historyList.innerHTML = response.opinions.slice(0, 10).map((opinion, index) => `
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
              <p style="font-size:13px; color:#0f172a; margin-bottom:8px;"><strong>Summary:</strong></p>
              <ul style="font-size:12px; color:#64748b; padding-left:16px; margin:0 0 8px;">
                ${(opinion.opinion?.summary || []).map(s => `<li>${s}</li>`).join('')}
              </ul>
              <button onclick="viewOpinion('${opinion.id}')" style="padding:8px 16px; background:#6366f1; color:white; border:none; border-radius:6px; font-size:12px; cursor:pointer;">View Full Opinion</button>
            </div>
          </div>
        `).join('');
    }
  });
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
  fetch('http://localhost:3000/api/second-opinion')
    .then(res => res.json())
    .then(data => {
      const opinion = data.opinions?.find(o => o.id === id);
      if (opinion) {
        const summaryHtml = (opinion.opinion.summary || []).map(p => `<li style="padding: 8px 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 6px; font-size: 13px; color: #475569;">• ${p}</li>`).join('');
        
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:999999;padding:20px;';
        panel.innerHTML = `
          <div style="background:white;border-radius:14px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:16px;font-weight:600;">${opinion.chatName || 'Second Opinion'}</span>
              <button onclick="this.closest('[style*=\\"position:fixed\\"]').remove()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;padding:0;line-height:1;opacity:0.8;">&times;</button>
            </div>
            <div style="padding:20px;">
              <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 12px;">Quick Summary</h4>
              <ul style="list-style:none;padding:0;margin:0 0 20px;">${summaryHtml}</ul>
              <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Alternative Perspectives</h4>
              <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">${opinion.opinion.alternativePerspectives || ''}</p>
              <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Assumptions</h4>
              <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 16px;">${opinion.opinion.assumptions || ''}</p>
              <h4 style="font-size:14px;font-weight:600;color:#0f172a;margin:0 0 8px;">Considerations</h4>
              <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0;">${opinion.opinion.considerations || ''}</p>
            </div>
          </div>
        `;
        document.body.appendChild(panel);
      }
    });
}
