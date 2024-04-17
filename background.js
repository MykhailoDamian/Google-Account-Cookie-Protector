let tabsInfo = [];
// Step 1.1: Delete Captured Cookies
function deleteCapturedCookies(callback) {
    chrome.storage.local.get(['storedCookies'], function(data) {
      const storedCookies = data.storedCookies || {};
  
      Object.keys(storedCookies).forEach(key => {
        const cookie = storedCookies[key];
        // Construct the removal URL
        const removalUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
        // Delete the cookie
        chrome.cookies.remove({url: removalUrl, name: key.split(';')[2]}, function() {
          if (chrome.runtime.lastError) {
            console.error(`Error deleting cookie: ${chrome.runtime.lastError}`);
          } else {
            console.log(`Cookie deleted: ${key}`);
          }
        });
      });
  
      if (callback) callback();
    });
  }
  
  // Modified Step 1: Capture Cookies and Tabs Information
  function captureCookiesAndTabs() {
    // Capture all open tabs
    chrome.tabs.query({}, function(tabs) {
      tabsInfo = tabs.map(tab => ({ id: tab.id, url: tab.url }));
  
      // Capture and store cookies, excluding httpOnly
      chrome.cookies.getAll({}, function(cookies) {
        let storedCookies = {};
        cookies.forEach(cookie => {
          if (!cookie.httpOnly) { // Exclude httpOnly cookies
            const key = `${cookie.domain};${cookie.path};${cookie.name}`;
            storedCookies[key] = {
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              sameSite: cookie.sameSite,
              expirationDate: cookie.expirationDate
            };
          }
        });
  

        chrome.storage.local.set({storedCookies}, function() {
          console.log('Non-httpOnly cookies have been stored.');
  
          // Delete cookies after storing them
          deleteCapturedCookies(function() {
            // Close tabs after deleting cookies
            const tabIds = tabsInfo.map(tab => tab.id);
            chrome.tabs.remove(tabIds, function() {
              console.log('Tabs closed.');
            });
          });
        });
      });
    });
  }
  

  function restoreCookiesAndTabs() {
    chrome.storage.local.get(['storedCookies'], function(data) {
      const storedCookies = data.storedCookies || {};
  
      Object.keys(storedCookies).forEach(key => {
        // Extract the individual cookie attributes from the key
        const parts = key.split(';');
        if (parts.length < 3) {
          console.error(`Invalid cookie key format: ${key}`);
          return; // Skip this iteration
        }
  
        const domain = parts[0].startsWith('.') ? parts[0].substring(1) : parts[0]; // Strip leading dot if exists
        const path = parts[1];
        const name = parts[2];
        const cookie = storedCookies[key];
  
        // Ensure correct protocol is used based on the secure attribute
        const protocol = cookie.secure ? 'https' : 'http';
        const url = `${protocol}://${domain}${path}`;
  
        // Log the cookie attributes before setting it
        console.log(`Attempting to set cookie: `, cookie);
  
        // Proceed to set the cookie
        chrome.cookies.set({
          url: url,
          name: name,
          value: cookie.value,
          domain: domain, // Set without the leading dot
          path: path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly, // Make sure this is set accordingly
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate
        }, function() {
          if (chrome.runtime.lastError) {
            console.error(`Error setting cookie named ${name}: ${chrome.runtime.lastError.message}`, cookie);
          } else {
            console.log(`Cookie restored: ${name}`);
          }
        });
      });
  
  
      // Reopen tabs
      tabsInfo.forEach(info => {
        chrome.tabs.create({ url: info.url });
      });
  
      // Clear stored cookies and tabs info after restoration
      chrome.storage.local.remove(['storedCookies'], function() {
        if (chrome.runtime.lastError) {
          console.error('Error clearing stored cookies from storage:', chrome.runtime.lastError.message);
        } else {
          console.log('Stored cookies and tabs info cleared from storage.');
          tabsInfo = [];
        }
      });
    });
  }
  


// Listener for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'endSession') {
    captureCookiesAndTabs();
    sendResponse({status: 'Session ended'});
  } else if (request.action === 'restoreSession') {
    restoreCookiesAndTabs();
    sendResponse({status: 'Session restored'});
  }
  return true; // Keep the messaging channel open for asynchronous response
});
