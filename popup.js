document.getElementById('encrypt').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'encrypt'}, function(response) {
      console.log(response.status);
    });
  });
  
  // Add a button in popup.html for decryption and handle click event
  document.getElementById('decrypt').addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'decrypt'}, function(response) {
      console.log(response.status);
    });
  });
  document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['encryptedCookies'], function(result) {
      if (result.encryptedCookies) {
        const formattedCookies = JSON.stringify(result.encryptedCookies, null, 2);
        // You would need to add an element to your popup.html to display this data
        document.getElementById('cookieDisplay').textContent = formattedCookies;
      }
    });
  });
  
  