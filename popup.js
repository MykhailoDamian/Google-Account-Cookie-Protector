document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('store').addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'store'}, function(response) {
        console.log(response.status);
      });
    });
  
    document.getElementById('restore').addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'restore'}, function(response) {
        console.log(response.status);
      });
    });
  });
  