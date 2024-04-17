document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('endSession').addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'endSession'}, function(response) {
        console.log(response.status);
      });
    });
  
    document.getElementById('restoreSession').addEventListener('click', function() {
      chrome.runtime.sendMessage({action: 'restoreSession'}, function(response) {
        console.log(response.status);
      });
    });
  });
  