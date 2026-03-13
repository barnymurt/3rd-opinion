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

  // State
  let sessionStartTime = null;
  let messageCount = 0;
  let hasShownPrompt = false;
  let currentPlatform = null;
  let lastAIResponse = '';

  // Detect current platform
  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chat.openai.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('perplexity.ai')) return 'perplexity';
    return null;
  }

  // Get message container selector for current platform
  function getMessageSelector() {
    const platform = detectPlatform();
    return CONFIG.MESSAGE_CONTAINER_SELECTORS[window.location.hostname] || null;
  }

  // Count messages in the chat
  function countMessages() {
    const selector = getMessageSelector();
    if (!selector) return 0;
    return document.querySelectorAll(selector).length;
  }

  // Extract latest AI response text
  function extractLatestAIResponse() {
    const platform = detectPlatform();
    let responseElement = null;

    switch (platform) {
      case 'chatgpt':
        responseElement = document.querySelector('[data-message-author-role="assistant"]:last-child');
        if (responseElement) {
          return responseElement.innerText || responseElement.textContent || '';
        }
        break;
      case 'claude':
        const claudeMessages = document.querySelectorAll('[class*="message"][class*="assistant"]');
        if (claudeMessages.length > 0) {
          responseElement = claudeMessages[claudeMessages.length - 1];
          return responseElement.innerText || responseElement.textContent || '';
        }
        break;
      case 'gemini':
        const geminiResponses = document.querySelectorAll('[class*="response"]');
        if (geminiResponses.length > 0) {
          responseElement = geminiResponses[geminiResponses.length - 1];
          return responseElement.innerText || responseElement.textContent || '';
        }
        break;
      case 'perplexity':
        const perplexityAnswers = document.querySelectorAll('[class*="answer-item"]');
        if (perplexityAnswers.length > 0) {
          responseElement = perplexityAnswers[perplexityAnswers.length - 1];
          return responseElement.innerText || responseElement.textContent || '';
        }
        break;
    }
    return '';
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
    if (!aiResponse || aiResponse.length < 50) {
      alert('Please wait for a longer AI response before getting a second opinion.');
      return;
    }

    // Send message to background script to trigger opinion generation
    chrome.runtime.sendMessage({
      type: 'GET_SECOND_OPINION',
      data: {
        aiResponse: aiResponse,
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
    if (!platform) return;

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

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SHOW_OPINION') {
        showOpinionPanel(message.opinion);
      }
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
