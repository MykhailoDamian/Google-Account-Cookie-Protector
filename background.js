chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    console.log('Intercepted request:', details);

    // Check if the request is for setting a cookie
    if (details.method === "POST" && details.type === "xmlhttprequest" && details.url.startsWith("https://") && details.url.includes("/setcookie")) {
      console.log('Request is for setting a cookie');

      // Modify the cookies as needed
      var modifiedCookies = [
        { name: "modifiedCookie1", value: "modifiedValue1", domain: details.url, path: "/" },
        // Add more modified cookies as needed
      ];

      console.log('Modified cookies:', modifiedCookies);

      // Store the modified cookies
      modifiedCookies.forEach(cookie => {
        chrome.cookies.set(cookie, function(setCookie) {
          if (chrome.runtime.lastError) {
            console.error('Error setting cookie:', chrome.runtime.lastError);
          } else {
            console.log('Successfully set cookie:', setCookie);
          }
        });
      });

      // Resolve the Promise with the modified request
      return { redirectUrl: "data:," };
    }
  },
  { urls: ["<all_urls>"] }
);
