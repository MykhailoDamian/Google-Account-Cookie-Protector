// Simple Base64 encoding and decoding functions
// URL-safe Base64 encoding
function encode(value) {
    return btoa(encodeURIComponent(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  
  // URL-safe Base64 decoding
  function decode(value) {
    value += '=='.slice(0, (4 - value.length % 4) % 4); // Add '=' padding
    return decodeURIComponent(atob(value.replace(/-/g, '+').replace(/_/g, '/')));
  }
  
  
  function encryptCookies() {
    chrome.cookies.getAll({}, function(cookies) {
      let encryptedCookies = {};
      cookies.forEach(cookie => {
        if (!cookie.httpOnly) { // Ensure we don't include httpOnly cookies
          const encryptedValue = encode(cookie.value);
          const key = `${cookie.domain};${cookie.path};${cookie.name}`;
          encryptedCookies[key] = encryptedValue;
          
          chrome.cookies.remove({
            url: "http" + (cookie.secure ? "s" : "") + "://" + cookie.domain + cookie.path,
            name: cookie.name
          });
        }
      });
  
      chrome.storage.local.set({encryptedCookies}, function() {
        console.log('Cookies have been encrypted and stored.');
      });
    });
  }
  function decryptCookies() {
    chrome.storage.local.get(['encryptedCookies'], function(data) {
      const encryptedCookies = data.encryptedCookies || {};
  
      for (const key of Object.keys(encryptedCookies)) {
        const [domain, path, name] = key.split(';');
        const encryptedValue = encryptedCookies[key];
        const decryptedValue = decode(encryptedValue);
  
        // Determine the correct URL protocol and format
        const url = `http${domain.startsWith('.') ? 's' : ''}://${domain}${path}`;
  
        // Log the cookie details to check for potential issues
        console.log(`Setting cookie - Name: ${name}, Domain: ${domain}, Path: ${path}, URL: ${url}`);
  
        chrome.cookies.set({
          url: url,
          name: name,
          value: decryptedValue,
          domain: domain.startsWith('.') ? domain.substring(1) : domain, // Trim leading dot for explicit domain
          path: path,
          secure: domain.startsWith('.'), // Use secure flag for domains that start with a dot
          // Note: You may need to handle other attributes such as 'httpOnly', 'sameSite', etc.
        }, function(cookie) {
          if (chrome.runtime.lastError) {
            console.error(`Error setting cookie named ${name}:`, chrome.runtime.lastError);
          } else {
            console.log(`Successfully set cookie named ${name}:`, cookie);
          }
        });
      }
  
      // Clear the stored encrypted cookies after restoring
      chrome.storage.local.remove(['encryptedCookies'], function() {
        if (chrome.runtime.lastError) {
          console.error('Error clearing encrypted cookies from storage:', chrome.runtime.lastError);
        } else {
          console.log('Encrypted cookies have been restored and cleared from storage.');
        }
      });
    });
  }
  
  // Listener for messages from the popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'encrypt') {
      encryptCookies();
      sendResponse({status: 'encryption_started'});
    } else if (request.action === 'decrypt') {
      decryptCookies();
      sendResponse({status: 'decryption_started'});
    }
  });
  