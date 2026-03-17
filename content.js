chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    document.querySelectorAll('p').forEach(p => {
      p.style.backgroundColor = 'yellow';
    });
  }
});