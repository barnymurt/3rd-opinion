// Second Opinion - Content Script
// Detects AI chat sessions and triggers second opinion prompts

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    SESSION_TIMEOUT_MS: 7 * 60 * 1000, // 7 minutes
    MAX_MESSAGES: 5,
    MESSAGE_CONTAINER_SELECTORS: {
      'chat.openai.com': '[data-message-author-role="assistant"], [data-message-author-role="user"]',
      'claude.ai': '[class*="message"], [class*="ConversationMessage"]',
      'gemini.google.com': '[class*="response"], [class*="user-input"]',
      'www.perplexity.ai': '[class*="answer-item"], [class*="user-query"]'
    }
  };

  // In-page modal system
  function showInPageModal(type, title, message) {
    // Remove existing modal if any
    const existing = document.getElementById('second-opinion-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'second-opinion-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999999;display:flex;align-items:center;justify-content:center;';
    
    const colors = {
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      error: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
      success: { bg: '#d1fae5', border: '#059669', text: '#065f46' },
      info: { bg: '#dbeafe', border: '#2563eb', text: '#1e40af' }
    };
    const c = colors[type] || colors.info;
    
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);border-left:4px solid ${c.border};">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:32px;height:32px;border-radius:50%;background:${c.bg};display:flex;align-items:center;justify-content:center;">
            ${type === 'warning' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' : ''}
            ${type === 'error' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>' : ''}
            ${type === 'success' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>' : ''}
          </div>
          <h3 style="font-size:18px;font-weight:600;margin:0;color:#0f172a;">${title}</h3>
        </div>
        <p style="font-size:14px;color:#64748b;margin:0 0 20px;line-height:1.5;">${message}</p>
        <button id="modal-ok-btn" style="width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">OK</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('modal-ok-btn').onclick = () => modal.remove();
  }

  // State
  let sessionStartTime = null;
  let messageCount = 0;
  let hasShownPrompt = false;
  let currentPlatform = null;
  let lastAIResponse = '';

  // Detect current platform
  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    if (hostname.includes('minimax.io') || hostname.includes('minimax')) return 'minimax';
    return null;
  }

  // Get message container selector for current platform
  function getMessageSelector() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) return '[data-message-author-role="assistant"]';
    if (hostname.includes('claude.ai')) return '[class*="message"], [class*="ConversationItem"], [data-testid*="message"]';
    if (hostname.includes('gemini.google.com')) return '[class*="response-container"], [class*="gemini-response"]';
    if (hostname.includes('perplexity.ai')) return '[class*="answer-item"], [class*="perplexity-answer"]';
    if (hostname.includes('minimax.io') || hostname.includes('minimax')) return '[class*="assistant-message"], [class*="mm-message"]';
    return null;
  }

  // Count messages in the chat
  function countMessages() {
    const selector = getMessageSelector();
    if (!selector) return 0;
    return document.querySelectorAll(selector).length;
  }

  // Extract user's question that prompted the AI response
  function extractUserQuestion() {
    const platform = detectPlatform();
    console.log('=== EXTRACTING USER QUESTION FOR:', platform, '===');
    
    // For ChatGPT - try multiple approaches
    if (platform === 'chatgpt' || !platform) {
      console.log('Using ChatGPT extraction logic...');
      
      // Approach 1: Look for elements with data-message-author-role="user"
      const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
      console.log('Found [data-message-author-role="user"]:', userMessages.length);
      
      // Get the last (most recent) user message
      if (userMessages.length > 0) {
        const lastUserMsg = userMessages[userMessages.length - 1];
        const text = (lastUserMsg.innerText || lastUserMsg.textContent || '').trim();
        console.log('Last user message text length:', text.length);
        if (text.length > 5) {
          console.log('SUCCESS - Found user question via role selector:', text.substring(0, 100));
          return text;
        }
      }
      
      // Approach 2: Look for any text that appears BEFORE the assistant message
      // by finding the conversation structure
      console.log('Trying conversation structure approach...');
      const messages = document.querySelectorAll('[data-message-author-role]');
      console.log('All role-marked messages:', messages.length);
      
      for (let i = messages.length - 2; i >= 0; i--) {
        if (messages[i].getAttribute('data-message-author-role') === 'user') {
          const text = (messages[i].innerText || messages[i].textContent || '').trim();
          if (text.length > 5) {
            console.log('SUCCESS - Found via conversation order:', text.substring(0, 100));
            return text;
          }
        }
      }
      
      // Approach 3: Find all text that could be user input
      console.log('Trying text content scan...');
      const body = document.body;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const texts = [];
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.length > 20 && text.length < 3000) {
          texts.push(text);
        }
      }
      console.log('Found', texts.length, 'text nodes in acceptable range');
      
      // The user question should be near the beginning, before the long AI response
      if (texts.length > 0) {
        // Return the first substantial text that's not the AI response
        const aiResponse = extractLatestAIResponse();
        for (const text of texts) {
          if (!aiResponse.includes(text) && text.length > 20) {
            console.log('SUCCESS - Found via text scan:', text.substring(0, 100));
            return text;
          }
        }
      }
    }
    
    // Generic extraction for other platforms
    const selectors = {
      'claude': ['[data-message-author-role="user"]', '[class*="user-message"]', 'textarea'],
      'gemini': ['[data-message-author-role="user"]', '[class*="user-input"]', 'textarea'],
      'perplexity': ['[data-message-author-role="user"]', '[class*="user-query"]', 'textarea'],
      'minimax': ['[data-message-author-role="user"]', '[class*="user-message"]', 'textarea']
    };
    
    const platformSelectors = selectors[platform] || [];
    
    for (const selector of platformSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          const text = (el.innerText || el.textContent || el.value || '').trim();
          if (text.length > 10) {
            console.log('Found via', selector, ':', text.substring(0, 80));
            return text;
          }
        }
      } catch (e) {}
    }
    
    console.log('FAILED - Could not find user question');
    return '';
  }
  function extractLatestAIResponse() {
    const platform = detectPlatform();
    console.log('=== EXTRACTING FOR PLATFORM:', platform, '===');
    console.log('URL:', window.location.href);
    
    const bodyText = document.body.innerText;
    console.log('Body text length:', bodyText.length);
    
    const selectors = {
      'chatgpt': [
        '[data-message-author-role="assistant"]',
        '[data-message-author-role="assistant"] .markdown',
        '[data-message-author-role="assistant"] [class*="content"]',
        '[class*="assistant"] [class*="message"]',
        '[class*="message"]:not([data-message-author-role="user"])'
      ],
      'claude': [
        '[data-message-author-role="assistant"]',
        '[class*="assistant-message"]',
        '[class*="ai-message"]',
        '[class*="message"]',
        '[data-testid*="message"]',
        '.prose',
        '.claude-message'
      ],
      'gemini': [
        '[data-message-author-role="model"]',
        '[data-message-author-role="assistant"]',
        '[class*="response-container"]',
        '[class*="gemini-response"]',
        '[class*="output"]',
        '[class*="model-response"]'
      ],
      'perplexity': [
        '[data-message-author-role="assistant"]',
        '[class*="answer-item"]',
        '[class*="perplexity-answer"]',
        '[class*="result"]',
        '[class*="ai-response"]'
      ],
      'minimax': [
        '[data-message-author-role="assistant"]',
        '[class*="assistant-message"]',
        '[class*="ai-message"]',
        '[class*="mm-response"]',
        '[class*="minimax-response"]',
        '[class*="model-output"]'
      ]
    };
    
    const platformSelectors = selectors[platform] || selectors['claude'];
    let longestText = '';
    
    for (const selector of platformSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log('Selector:', selector, 'found:', elements.length);
        for (const el of elements) {
          const text = (el.innerText || el.textContent || '').trim();
          if (text.length > longestText.length) {
            longestText = text;
            console.log('New longest:', text.length, 'chars');
          }
        }
      } catch (e) {
        console.log('Selector error:', selector, e.message);
      }
    }
    
    if (longestText.length < 50) {
      console.log('Trying fallback...');
      const allElements = document.querySelectorAll('div, p, span, article');
      for (const el of allElements) {
        const text = (el.innerText || '').trim();
        if (text.length > 100 && text.length < 50000 && 
            !el.matches('input, textarea, button') &&
            !el.closest('form')) {
          if (text.length > longestText.length) {
            longestText = text;
            console.log('Fallback found:', text.length, 'chars');
          }
        }
      }
    }
    
    console.log('FINAL text length:', longestText.length);
    console.log('Preview:', longestText.substring(0, 200));
    return longestText;
  }

  // Create and show the prompt banner
  function showPromptBanner() {
    if (hasShownPrompt) return;
    
    const existingBanner = document.getElementById('second-opinion-banner');
    if (existingBanner) return;

    const banner = document.createElement('div');
    banner.id = 'second-opinion-banner';
    banner.innerHTML = `
      <div class="second-opinion-banner">
        <div class="so-banner-content">
          <div class="so-banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="so-banner-text">
            <strong>AI can sometimes tell you what you want to hear, not what you need to hear.</strong>
            <span>Get a balanced perspective?</span>
          </div>
          <div class="so-banner-actions">
            <button id="so-get-opinion" class="so-btn so-btn-primary">Get Second Opinion</button>
            <button id="so-dismiss" class="so-btn so-btn-secondary">Not now</button>
          </div>
        </div>
      </div>
    `;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
      .second-opinion-banner {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: so-slide-in 0.3s ease-out;
      }
      @keyframes so-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .so-banner-content {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        max-width: 380px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .so-banner-icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.2);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .so-banner-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .so-banner-text strong {
        font-size: 14px;
        line-height: 1.3;
      }
      .so-banner-text span {
        font-size: 12px;
        opacity: 0.9;
      }
      .so-banner-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
      .so-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .so-btn-primary {
        background: white;
        color: #667eea;
      }
      .so-btn-primary:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .so-btn-secondary {
        background: rgba(255,255,255,0.15);
        color: white;
      }
      .so-btn-secondary:hover {
        background: rgba(255,255,255,0.25);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('so-get-opinion').addEventListener('click', handleGetOpinion);
    document.getElementById('so-dismiss').addEventListener('click', handleDismiss);
  }

  // Handle get opinion button click
  async function handleGetOpinion() {
    const aiResponse = extractLatestAIResponse();
    const userQuestion = extractUserQuestion();
    if (!aiResponse || aiResponse.length < 50) {
      showInPageModal('warning', 'Response Too Short', 'Please wait for a longer AI response before getting a second opinion.');
      return;
    }

    // Send message to background script to trigger opinion generation
    chrome.runtime.sendMessage({
      type: 'GET_SECOND_OPINION',
      data: {
        aiResponse: aiResponse,
        userQuestion: userQuestion,
        platform: detectPlatform(),
        url: window.location.href
      }
    }, (response) => {
      if (response && response.success) {
        showOpinionPanel(response.opinion);
      } else {
        alert('Failed to get second opinion. Please try again.');
      }
    });

    handleDismiss();
  }

  // Show the opinion in a panel
  function showOpinionPanel(opinion) {
    const existingPanel = document.getElementById('second-opinion-panel');
    if (existingPanel) existingPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'second-opinion-panel';
    panel.innerHTML = `
      <div class="so-panel">
        <div class="so-panel-header">
          <div class="so-panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Second Opinion
          </div>
          <button id="so-close-panel" class="so-close-btn">&times;</button>
        </div>
        <div class="so-panel-content">
          <div class="so-summary">
            <h4>Quick Summary</h4>
            <ul>
              ${(opinion.summary || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div class="so-details">
            <button id="so-toggle-details" class="so-toggle-btn">Read Full Perspective</button>
            <div class="so-detail-content" style="display: none;">
              <h4>Alternative Perspectives</h4>
              <p>${opinion.alternativePerspectives || ''}</p>
              <h4>Challenged Assumptions</h4>
              <p>${opinion.assumptions || ''}</p>
              <h4>Additional Considerations</h4>
              <p>${opinion.considerations || ''}</p>
            </div>
          </div>
          <div class="so-tts-controls">
            <button id="so-tts-play" class="so-tts-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Listen
            </button>
            <button id="so-tts-skip" class="so-tts-btn so-tts-btn-secondary">Skip to next point</button>
          </div>
        </div>
      </div>
    `;

    // Inject panel styles
    const style = document.createElement('style');
    style.textContent = `
      .so-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 380px;
        max-height: calc(100vh - 40px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        animation: so-slide-in 0.3s ease-out;
      }
      @keyframes so-slide-in {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .so-panel-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .so-panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
      }
      .so-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
      }
      .so-close-btn:hover { opacity: 1; }
      .so-panel-content {
        padding: 20px;
        max-height: calc(100vh - 150px);
        overflow-y: auto;
      }
      .so-summary {
        margin-bottom: 20px;
      }
      .so-summary h4 {
        color: #1a1a2e;
        font-size: 14px;
        margin-bottom: 12px;
      }
      .so-summary ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .so-summary li {
        padding: 10px 12px;
        background: #f8f9fa;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 13px;
        line-height: 1.5;
        color: #444;
      }
      .so-details {
        margin-bottom: 20px;
      }
      .so-toggle-btn {
        width: 100%;
        padding: 12px;
        background: #f1f3f4;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #667eea;
        cursor: pointer;
        transition: background 0.2s;
      }
      .so-toggle-btn:hover { background: #e8eaed; }
      .so-detail-content h4 {
        color: #1a1a2e;
        font-size: 13px;
        margin: 20px 0 8px;
      }
      .so-detail-content p {
        color: #555;
        font-size: 13px;
        line-height: 1.6;
        margin: 0;
      }
      .so-tts-controls {
        display: flex;
        gap: 10px;
        padding-top: 16px;
        border-top: 1px solid #eee;
      }
      .so-tts-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px 16px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      }
      .so-tts-btn:hover { background: #5a6fd6; }
      .so-tts-btn-secondary {
        background: #f1f3f4;
        color: #444;
      }
      .so-tts-btn-secondary:hover { background: #e8eaed; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('so-close-panel').addEventListener('click', () => panel.remove());
    document.getElementById('so-toggle-details').addEventListener('click', function() {
      const content = document.querySelector('.so-detail-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
      this.textContent = content.style.display === 'none' ? 'Read Full Perspective' : 'Hide Details';
    });
    document.getElementById('so-tts-play').addEventListener('click', () => handleTTS(opinion));
  }

  // Handle text-to-speech
  function handleTTS(opinion) {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const summaryPoints = opinion.summary || [];
      let currentIndex = 0;

      function speakNext() {
        if (currentIndex >= summaryPoints.length) {
          return;
        }

        const utterance = new SpeechSynthesisUtterance(summaryPoints[currentIndex]);
        utterance.rate = 1;
        utterance.onend = () => {
          currentIndex++;
          speakNext();
        };
        window.speechSynthesis.speak(utterance);
      }

      speakNext();
    }
  }

  // Handle dismiss button
  function handleDismiss() {
    const banner = document.getElementById('second-opinion-banner');
    if (banner) {
      banner.style.animation = 'so-slide-out 0.3s ease-out';
      setTimeout(() => banner.remove(), 300);
    }
    hasShownPrompt = true;
  }

  // Check if trigger conditions are met
  function checkTriggerConditions() {
    if (hasShownPrompt) return;

    const currentMessageCount = countMessages();
    const sessionDuration = sessionStartTime ? Date.now() - sessionStartTime : 0;

    // Trigger after 7 minutes AND fewer than 5 messages
    if (sessionDuration >= CONFIG.SESSION_TIMEOUT_MS && currentMessageCount < CONFIG.MAX_MESSAGES) {
      showPromptBanner();
    }
  }

  // Initialize the content script
  function init() {
    const platform = detectPlatform();
    console.log('=== CONTENT SCRIPT LOADED ===');
    console.log('Platform:', platform);
    console.log('URL:', window.location.href);
    
    if (!platform) {
      console.log('Not an AI chat platform, exiting');
      return;
    }

    currentPlatform = platform;
    sessionStartTime = Date.now();
    messageCount = countMessages();

    // Monitor for new messages
    setInterval(() => {
      const newCount = countMessages();
      if (newCount > messageCount) {
        messageCount = newCount;
        // Reset session timer on new message if it's been a while
        if (Date.now() - sessionStartTime > 2 * 60 * 1000) {
          sessionStartTime = Date.now();
        }
      }
    }, 1000);

    // Check trigger conditions periodically
    setInterval(checkTriggerConditions, 10000);
  }

  // Generate a short name from the AI response
  function generateChatName(aiResponse) {
    if (!aiResponse || aiResponse.length < 20) return 'Untitled Chat';
    
    // Try to extract first meaningful sentence or phrase
    const firstLine = aiResponse.split('\n').find(line => line.trim().length > 10) || aiResponse;
    const words = firstLine.trim().split(/\s+/).slice(0, 6);
    let name = words.join(' ');
    
    // Clean up the name
    name = name.replace(/^[A-Z][a-z]+\s[a-z]+\s[a-z]+\s*/, ''); // Remove common prefixes
    name = name.replace(/[^\w\s]$/, ''); // Remove trailing punctuation
    
    if (name.length > 40) {
      name = name.substring(0, 37) + '...';
    }
    
    return name || 'Chat ' + new Date().toLocaleDateString();
  }

  // Listen for messages from popup and background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    if (message.type === 'CALL_API') {
      // Content script makes API call (can bypass CORS)
      console.log('Making API call from content script...');
      fetch('http://localhost:3000/api/second-opinion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.data)
      })
      .then(res => {
        console.log('API response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('API response:', data);
        sendResponse(data);
      })
      .catch(err => {
        console.error('API error:', err);
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
    
    if (message.type === 'SHOW_OPINION') {
      showOpinionPanel(message.opinion);
    }
    
    if (message.action === 'getAIResponse' || message.action === 'getFullPageText') {
      console.log('=== GOT MESSAGE:', message.action, '===');
      
      // Extract AI response and user question
      const aiResponse = extractLatestAIResponse();
      const userQuestion = extractUserQuestion();
      const chatName = generateChatName(aiResponse);
      
      console.log('User question:', userQuestion ? userQuestion.substring(0, 100) : 'none');
      console.log('AI response length:', aiResponse.length);
      console.log('AI response preview:', aiResponse.substring(0, 200));
      
      // Return combined data
      sendResponse({
        text: aiResponse,
        aiResponse: aiResponse,
        userQuestion: userQuestion,
        platform: detectPlatform(),
        chatName: chatName
      });
      return true;
    }
    
    if (message.action === 'triggerSecondOpinion' || message.action === 'getSecondOpinion') {
      const aiResponse = extractLatestAIResponse();
      const userQuestion = extractUserQuestion();
      console.log('Extracted AI response:', aiResponse ? aiResponse.substring(0, 100) + '...' : 'EMPTY');
      console.log('Extracted user question:', userQuestion ? userQuestion.substring(0, 100) + '...' : 'EMPTY');
      const chatName = generateChatName(aiResponse);
      console.log('Generated chat name:', chatName);
      console.log('Platform:', detectPlatform());
      if (!aiResponse || aiResponse.length < 50) {
        showInPageModal('warning', 'No AI Response', 'Could not detect AI response. Make sure Claude has sent a message at least 50 characters long.');
        return;
      }
      chrome.runtime.sendMessage({
        type: 'GET_SECOND_OPINION',
        data: {
          aiResponse: aiResponse,
          userQuestion: userQuestion,
          platform: detectPlatform(),
          url: window.location.href,
          chatName: chatName
        }
      }, (response) => {
        if (response && response.success) {
          showOpinionPanel(response.opinion);
        } else if (response?.error) {
          showInPageModal('error', 'Error', response.error);
        } else {
          showInPageModal('error', 'Request Failed', 'Failed to get second opinion. Please try again.');
        }
      });
    }
  });

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
