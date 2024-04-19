document.addEventListener('DOMContentLoaded', function() {
    const toggleSession = document.getElementById('toggleSwitch');
    
    toggleSession.addEventListener('change', function() {
      if (this.checked) {
        console.log("Session Active");
      } else {
        chrome.runtime.sendMessage({action: 'endSession'}, function(response) {
          console.log(response.status);
          console.log("Session Ended");
        });
      }
    });
  });
  