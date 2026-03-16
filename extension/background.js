// Second Opinion - Background Service Worker
// Handles API calls and credit management

// API Base URL - change this to your deployed API
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-domain.com'
  : 'http://localhost:3000';

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SECOND_OPINION') {
    handleGetOpinion(message.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'CALL_API') {
    // Popup calling API via background to avoid CORS
    fetch(API_BASE_URL + '/api/second-opinion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.data)
    })
    .then(res => res.json())
    .then(data => sendResponse(data))
    .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (message.type === 'GET_HISTORY') {
    fetch(API_BASE_URL + '/api/second-opinion')
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ opinions: [], error: err.message }));
    return true;
  }
});

async function handleGetOpinion(data) {
  const { aiResponse, platform, url, chatName } = data;

  // Check credits
  if (userCredits <= 0) {
    return {
      success: false,
      error: 'No credits remaining',
      upgradeRequired: true
    };
  }

  try {
    // Call the opinion API
    const response = await fetch(`${API_BASE_URL}/api/second-opinion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        aiResponse,
        platform,
        url,
        chatName
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get second opinion');
    }

    const result = await response.json();

    // Decrement credits
    userCredits--;

    return {
      success: true,
      opinion: result.opinion,
      creditsRemaining: userCredits
    };
  } catch (error) {
    console.error('Second Opinion error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Second Opinion extension installed');
    // Initialize user with free credits
    userCredits = 20;
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open dashboard when clicking extension icon
  chrome.tabs.create({ url: `${API_BASE_URL}/` });
});
