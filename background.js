let tabsInfo = [];

// Function to get or generate a unique token
async function getOrGenerateToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['uniqueToken'], function(result) {
            if (result.uniqueToken) {
                console.log("Unique token found in storage:", result.uniqueToken);
                resolve(result.uniqueToken);
            } else {
                // Token not found, generate a new one
                const randomBuffer = crypto.getRandomValues(new Uint8Array(16));
                const token = btoa(String.fromCharCode.apply(null, randomBuffer));
                chrome.storage.local.set({uniqueToken: token}, function() {
                    console.log("Unique token generated and stored:", token);
                    resolve(token);
                });
            }
        });
    });
}

// Utility function to generate a raw key
async function generateRawKey() {
    try {
        const token = await getOrGenerateToken();
        const encoder = new TextEncoder();
        const data = encoder.encode(token + 'stable-browser-identifier');
        const rawKey = await crypto.subtle.digest('SHA-256', data);
        console.log("Raw key generated.");
        return rawKey;
    } catch (error) {
        console.error("Error generating raw key:", error);
        throw error;
    }
}

// Utility function to import a raw key to CryptoKey
async function importKey(rawKey) {
    try {
        const key = await crypto.subtle.importKey(
            'raw',
            rawKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
        console.log("CryptoKey imported.");
        return key;
    } catch (error) {
        console.error("Error importing key:", error);
        throw error;
    }
}

// Utility function to encrypt a value
async function encryptValue(value, iv) {
    try {
        const rawKey = await generateRawKey();
        const key = await importKey(rawKey);
        const encodedValue = new TextEncoder().encode(value);
        const encryptedValue = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedValue);
        return btoa(String.fromCharCode(...new Uint8Array(encryptedValue)));
    } catch (error) {
        console.error('Error during encryption:', error);
        throw error;
    }
}

// Utility function to decrypt a value
async function decryptValue(encryptedValue, iv) {
    try {
        const rawKey = await generateRawKey();
        const key = await importKey(rawKey);
        const decodedValue = atob(encryptedValue);
        const decryptedValue = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, Uint8Array.from(decodedValue, c => c.charCodeAt(0)));
        return new TextDecoder().decode(decryptedValue);
    } catch (error) {
        console.error('Error during decryption:', error);
        throw error;
    }
}

// Function to capture and encrypt cookies and tabs
async function captureAndEncryptCookiesAndTabs() {
    chrome.tabs.query({}, async function(tabs) {
        tabsInfo = tabs.map(tab => ({ id: tab.id, url: tab.url }));
        chrome.cookies.getAll({}, async function(cookies) {
            let storedCookies = {};
            for (const cookie of cookies) {
                if (!cookie.httpOnly) {
                    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
                    const encryptedValue = await encryptValue(cookie.value, iv);
                    const key = `${cookie.domain};${cookie.path};${cookie.name}`;
                    storedCookies[key] = {
                        value: encryptedValue,
                        iv: Array.from(iv), // Store IV with the encrypted value for decryption
                        // Rest of the cookie properties
                        domain: cookie.domain,
                        path: cookie.path,
                        secure: cookie.secure,
                        sameSite: cookie.sameSite,
                        expirationDate: cookie.expirationDate
                    };
                }
            }

            chrome.storage.local.set({ storedCookies }, function() {
                console.log('Non-httpOnly cookies have been encrypted and stored.');
                deleteCapturedCookies(function() {
                    const tabIds = tabsInfo.map(tab => tab.id);
                    chrome.tabs.remove(tabIds, function() {
                        console.log('Tabs closed.');
                    });
                });
            });
        });
    });
}

// Function to decrypt and restore cookies and tabs
async function decryptAndRestoreCookiesAndTabs() {
    console.log("Starting to decrypt and restore cookies...");
    chrome.storage.local.get(['storedCookies'], async function(data) {
        const storedCookies = data.storedCookies || {};
        if (Object.keys(storedCookies).length === 0) {
            console.log("No stored cookies to restore.");
            return;
        }

        for (const key of Object.keys(storedCookies)) {
            const parts = key.split(';');
            if (parts.length < 3) {
                console.error(`Invalid cookie key format: ${key}`);
                continue; // Skip to next iteration
            }

            const domain = parts[0].startsWith('.') ? parts[0].substring(1) : parts[0];
            const path = parts[1];
            const name = parts[2];
            const cookie = storedCookies[key];
            const url = `${cookie.secure ? 'https' : 'http'}://${domain}${path}`;
            const iv = new Uint8Array(cookie.iv);

            // Decrypt cookie value
            try {
                const decryptedValue = await decryptValue(cookie.value, iv);

                // Set cookie with decrypted value
                chrome.cookies.set({
                    url: url,
                    name: name,
                    value: decryptedValue,
                    domain: domain,
                    path: path,
                    secure: cookie.secure,
                    sameSite: cookie.sameSite,
                    expirationDate: cookie.expirationDate
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error(`Error setting cookie named ${name}: `, chrome.runtime.lastError.message);
                    } else {
                        console.log(`Cookie successfully set - Name: ${name}, Domain: ${domain}, Path: ${path}, Secure: ${cookie.secure}`);
                    }
                });
            } catch (error) {
                console.error(`Error decrypting or setting cookie named ${name}: `, error);
            }
        }

        // Reopen tabs and clear storage
        tabsInfo.forEach(info => {
            chrome.tabs.create({ url: info.url });
        });
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

function deleteCapturedCookies(callback) {
    chrome.storage.local.get(['storedCookies'], function(data) {
        const storedCookies = data.storedCookies || {};
        
        Object.keys(storedCookies).forEach(key => {
            const parts = key.split(';');
            if (parts.length < 3) {
                console.error(`Invalid cookie key format: ${key}`);
                return; // Skip this iteration
            }

            const domain = parts[0];
            const path = parts[1];
            const name = parts[2];
            // Construct the removal URL
            const protocol = storedCookies[key].secure ? 'https' : 'http';
            const removalUrl = `${protocol}://${domain}${path}`;

            // Delete the cookie
            chrome.cookies.remove({ url: removalUrl, name }, function() {
                if (chrome.runtime.lastError) {
                    console.error(`Error deleting cookie named ${name}: ${chrome.runtime.lastError}`);
                } else {
                    console.log(`Cookie deleted: ${name}`);
                }
            });
        });

        if (callback) {
            callback();
        }
    });
}

chrome.runtime.onStartup.addListener(async function() {
    console.log("Chrome started. Restoring cookies.");
    await decryptAndRestoreCookiesAndTabs().catch(e => console.error(e));
});
  
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'endSession') {
        captureAndEncryptCookiesAndTabs().catch(e => console.error(e));
        sendResponse({ status: 'Session ended' });
    }
    return true; // Keep the messaging channel open for asynchronous response
});
