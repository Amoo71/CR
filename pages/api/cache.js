/**
 * Server-side cache for accounts and timestamp
 * All devices will see the same data and last checked time
 */

// In-memory cache (persists for the lifetime of the server process)
let cachedData = {
  accounts: null,
  lastChecked: null,
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return cached data
    return res.status(200).json(cachedData);
  } else if (req.method === 'POST') {
    // Update cached data
    const { accounts, lastChecked } = req.body;
    
    if (accounts !== undefined) {
      cachedData.accounts = accounts;
    }
    if (lastChecked !== undefined) {
      cachedData.lastChecked = lastChecked;
    }
    
    return res.status(200).json({ success: true, data: cachedData });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
