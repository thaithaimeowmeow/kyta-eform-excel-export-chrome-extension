chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed!');
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchData') {
    fetch('https://api.example.com/data')
      .then(r => r.json())
      .then(data => sendResponse(data));
    return true; // keep message channel open for async
  }
});