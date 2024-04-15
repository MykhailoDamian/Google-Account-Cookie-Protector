// Function to encrypt the cookie value
// Placeholder: replace with your actual encryption algorithm
function encryptCookieValue(value) {
    // Implement the encryption logic here
    // For demo purposes, we'll just prefix the value with 'encrypted_'
    return 'encrypted_' + value;
  }
  
  // Function to decrypt the cookie value
  // Placeholder: replace with your actual decryption algorithm
  function decryptCookieValue(value) {
    // Implement the decryption logic here
    // For demo purposes, we'll remove the 'encrypted_' prefix
    return value.replace('encrypted_', '');
  }
  
  // Listen for changes to cookies
  chrome.cookies.onChanged.addListener(function(changeInfo) {
    if (!changeInfo.removed) {
      const cookie = changeInfo.cookie;
      const encryptedValue = encryptCookieValue(cookie.value);
  
      const newCookie = {
        url: (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path,
        name: cookie.name,
        value: encryptedValue,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite
      };
  
      // Check if the cookie is a session cookie or a persistent cookie
      if (!cookie.session) {
        newCookie.expirationDate = cookie.expirationDate;
      }
  
      // Replace the cookie with its encrypted version
      chrome.cookies.remove({
        url: newCookie.url,
        name: cookie.name
      }, function(details) {
        chrome.cookies.set(newCookie, function() {
          if (chrome.runtime.lastError) {
            console.error('Error setting encrypted cookie:', chrome.runtime.lastError);
          } else {
            console.log('Encrypted cookie set:', newCookie);
          }
        });
      });
    }
  });
  