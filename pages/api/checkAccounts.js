/**
 * API route to validate multiple Crunchyroll accounts. Receives an array of
 * objects with `email` and `password` fields and an optional region string. For
 * each entry it attempts to log in via crunchyroll.js and retrieve the user
 * profile. The result for each account indicates whether authentication
 * succeeded along with the profile (if successful) or an error message.
 *
 * Example POST body:
 * {
 *   "accounts": [ {"email": "user@example.com", "password": "pass123"}, … ],
 *   "region": "de-DE"
 * }
 *
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { accounts = [], region } = req.body || {};
  
  // Support both single account and batch mode
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'No accounts specified' });
  }
  
  // If only one account, check it directly
  if (accounts.length === 1) {
    const { email, password } = accounts[0];
    if (!email || !password) {
      return res.status(200).json({ results: [{ email, password, ok: false, error: 'Invalid account format' }] });
    }
    
    try {
      // Use require to force fresh module load
      delete require.cache[require.resolve('crunchyroll.js')];
      const cr = require('crunchyroll.js');
      
      await cr.login(email, password, region || undefined);
      const profile = await cr.getProfile();
      
      // Logout to clean up session
      try {
        if (typeof cr.logout === 'function') {
          await cr.logout();
        }
      } catch (logoutErr) {
        // Ignore logout errors
      }
      
      // When the profile contains an error code we treat it as invalid
      if (profile && typeof profile === 'object' && profile.code) {
        return res.status(200).json({ results: [{ email, password, ok: false, errorCode: profile.code, error: profile.code }] });
      } else {
        return res.status(200).json({ results: [{ email, password, ok: true, profile }] });
      }
    } catch (err) {
      return res.status(200).json({ results: [{ email, password, ok: false, errorCode: err?.code, error: err?.message || String(err) }] });
    }
  }
  
  // Batch mode - not recommended due to session conflicts
  const results = [];
  for (const acc of accounts) {
    const { email, password } = acc;
    if (!email || !password) {
      results.push({ email, password, ok: false, error: 'Invalid account format' });
      continue;
    }
    
    try {
      delete require.cache[require.resolve('crunchyroll.js')];
      const cr = require('crunchyroll.js');
      
      await cr.login(email, password, region || undefined);
      const profile = await cr.getProfile();
      
      try {
        if (typeof cr.logout === 'function') {
          await cr.logout();
        }
      } catch (logoutErr) {
        // Ignore
      }
      
      if (profile && typeof profile === 'object' && profile.code) {
        results.push({ email, password, ok: false, errorCode: profile.code, error: profile.code });
      } else {
        results.push({ email, password, ok: true, profile });
      }
    } catch (err) {
      results.push({ email, password, ok: false, errorCode: err?.code, error: err?.message || String(err) });
    }
  }
  
  return res.status(200).json({ results });
}