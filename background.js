chrome.webRequest.onHeadersReceived.addListener(
    function(details) {
      // Log the original headers for debugging
      console.log('Original headers:', details.responseHeaders);
  
      let modified = false; // Flag to indicate if we modified any cookie
  
      // Iterate over the response headers to find and modify Set-Cookie headers
      let responseHeaders = details.responseHeaders.map(header => {
        if (header.name.toLowerCase() === 'set-cookie') {
          // For demonstration, replace the cookie value with "ModifiedCookieValue"
          // You can replace "ModifiedCookieValue" with any string for testing
          header.value = header.value.replace(/=(.*?)(;|$)/, '=ModifiedCookieValue;');
          modified = true; // Set the flag to true since we modified the cookie
        }
        return header;
      });
  
      // If any cookie was modified, log the modified headers
      if (modified) {
        console.log('Modified headers:', responseHeaders);
      }
  
      // Return the modified response headers to be applied
      return {responseHeaders};
    },
    {urls: ["<all_urls>"]}, // Filter for all URLs
    ["blocking", "responseHeaders"] // Necessary to modify the headers
  );
  