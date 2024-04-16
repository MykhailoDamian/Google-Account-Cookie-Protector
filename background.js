// Function to store cookies
function storeCookies() {
    chrome.cookies.getAll({}, function(cookies) {
      let storedCookies = {};
      cookies.forEach(cookie => {
        if (!cookie.httpOnly) { // Ensure we don't include httpOnly cookies
          const key = `${cookie.domain};${cookie.path};${cookie.name}`;
          storedCookies[key] = cookie.value;
          
          // Remove the cookie from the browser
          chrome.cookies.remove({
            url: "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
            name: cookie.name
          });
        }
      });
  
      // Store the cookies in local storage
      chrome.storage.local.set({storedCookies}, function() {
        console.log('Cookies have been stored.');
      });
    });
  }
  
  function restoreCookies() {
    chrome.storage.local.get(['storedCookies'], function(data) {
      const storedCookies = data.storedCookies || {};
  
      Object.keys(storedCookies).forEach(key => {
        const [domain, path, name] = key.split(';');
        const value = storedCookies[key];
  
        // If the domain starts with a dot, it's a wildcard domain cookie (e.g., .example.com),
        // and should likely be set with https. If there's no dot, we assume http.
        const secure = domain.startsWith('.');
        const urlPrefix = secure ? 'https://' : 'http://';
        const adjustedDomain = secure ? domain.substring(1) : domain; // Remove leading dot for secure cookies
        const url = `${urlPrefix}${adjustedDomain}${path}`;
  
        chrome.cookies.set({
          url: url,
          name: name,
          value: value,
          domain: adjustedDomain, // Set the domain without leading dot
          path: path,
          secure: secure, // Set the secure attribute based on the domain
          // You may also need to include httpOnly, and sameSite if they were set originally
        }, function() {
          if (chrome.runtime.lastError) {
            console.error(`Error setting cookie named ${name}:`, chrome.runtime.lastError);
          } else {
            console.log(`Successfully set cookie named ${name}`);
          }
        });
      });
  
      // Clear the stored cookies after restoring
      chrome.storage.local.remove(['storedCookies'], function() {
        if (chrome.runtime.lastError) {
          console.error('Error clearing stored cookies from storage:', chrome.runtime.lastError);
        } else {
          console.log('Stored cookies have been restored and cleared from storage.');
        }
      });
    });
  }
  
  // Listener for messages from the popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'store') {
      storeCookies();
      sendResponse({status: 'store_started'});
    } else if (request.action === 'restore') {
      restoreCookies();
      sendResponse({status: 'restore_started'});
    }
  });
  