// Popup script for Second Opinion extension

document.addEventListener('DOMContentLoaded', () => {
  // Load user credits from storage
  chrome.storage.local.get(['credits', 'tier'], (result) => {
    const credits = result.credits || 20;
    const tier = result.tier || 'free';
    
    const creditsValue = document.querySelector('.credits-value');
    if (creditsValue) {
      creditsValue.innerHTML = `${credits} <span>/ month</span>`;
    }

    // Update upgrade button based on tier
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (tier === 'pro') {
      upgradeBtn.textContent = 'Manage Subscription';
    }
  });

  // Handle upgrade button click
  document.getElementById('upgradeBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/upgrade' });
  });

  // Handle dashboard link
  document.getElementById('dashboardLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });
});
