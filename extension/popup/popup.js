// Popup script for Second Opinion extension

const API_BASE = 'http://localhost:3002';

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });
  
  chrome.storage.local.get(['credits', 'tier'], (result) => {
    const credits = result.credits || 20;
    const tier = result.tier || 'free';
    
    const creditsValue = document.querySelector('.credits-value');
    if (creditsValue) {
      creditsValue.innerHTML = `${credits} <span>/ month</span>`;
    }

    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    if (progressFill && progressText) {
      const used = 20 - credits;
      const percentage = (credits / 20) * 100;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${credits} of 20 credits used`;
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

  document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3002/second-opinion' });
  });

  document.getElementById('dashboardLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost:3002/second-opinion' });
  });

  document.getElementById('getOpinionBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('getOpinionBtn');
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        alert('No active tab');
        btn.textContent = 'Get Second Opinion';
        btn.disabled = false;
        return;
      }
      
      console.log('Tab URL:', tabs[0].url);
      
      // Try messaging the content script first
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getFullPageText' }, (response) => {
        console.log('Content script response:', response);
        
        if (chrome.runtime.lastError) {
          console.log('Runtime error, trying executeScript:', chrome.runtime.lastError.message);
          
          // Fallback: use executeScript
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => document.body.innerText
          }, (results) => {
            console.log('executeScript results:', results);
            handlePageText(results?.[0]?.result || '', tabs[0].url, btn);
          });
        } else if (response && response.text) {
          handlePageText(response.text, tabs[0].url, btn);
        } else {
          alert('Could not get page content. Make sure you are on an AI chat page with content.');
          btn.textContent = 'Get Second Opinion';
          btn.disabled = false;
        }
      });
    });
    
    function handlePageText(text, url, btn) {
      console.log('Page text length:', text.length);
      
      if (!text || text.length < 100) {
        alert('Page appears empty. Try refreshing the chat page.');
        btn.textContent = 'Get Second Opinion';
        btn.disabled = false;
        return;
      }
      
      fetch(API_BASE + '/api/second-opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiResponse: text.substring(0, 8000),
          platform: url.includes('claude') ? 'clude' : url.includes('chat.openai') ? 'chatgpt' : 'other',
          url: url,
          chatName: text.substring(0, 40) + '...'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showResultInPopup(data.opinion, data.opinion?.summary?.[0] || 'Second Opinion');
        } else {
          alert('Error: ' + (data.error || 'Failed'));
        }
        btn.textContent = 'Get Second Opinion';
        btn.disabled = false;
      })
      .catch(err => {
        alert('Error: ' + err.message);
        btn.textContent = 'Get Second Opinion';
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

function loadHistory() {
  fetch(API_BASE + '/api/second-opinion')
    .then(res => res.json())
    .then(data => {
      const historyList = document.getElementById('history-list');
      if (!historyList) return;
      
      if (data.opinions && data.opinions.length > 0) {
        historyList.innerHTML = data.opinions.slice(0, 10).map(opinion => `
          <div style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'" onclick="viewOpinion('${opinion.id}')">
            <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 4px;">${opinion.chatName || 'Untitled Chat'}</p>
            <p style="font-size: 12px; color: #64748b; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${opinion.aiResponse.substring(0, 50)}...</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0;">${new Date(opinion.createdAt).toLocaleDateString()} · ${opinion.platform}</p>
          </div>
        `).join('');
      }
    })
    .catch(err => console.error('Failed to load history:', err));
}

function viewOpinion(id) {
  fetch('http://localhost:3002/api/second-opinion')
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
