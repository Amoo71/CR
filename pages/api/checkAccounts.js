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
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return res.status(400).json({ error: 'No accounts specified' });
  }
  const results = [];
  let count = 0;
  for (const acc of accounts) {
    const { email, password } = acc;
    if (!email || !password) {
      results.push({ ...acc, ok: false, error: 'Invalid account format' });
      count++;
      // Pause after every 5 attempts
      if (count % 5 === 0 && count < accounts.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      continue;
    }
    try {
      // Dynamic import to get a fresh module instance
      const crModule = await import('crunchyroll.js');
      const cr = crModule.default || crModule;
      
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
        results.push({ email, password, ok: false, errorCode: profile.code, error: profile.code });
      } else {
        results.push({ email, password, ok: true, profile });
      }
    } catch (err) {
      // Some errors may have a code property
      results.push({ email, password, ok: false, errorCode: err?.code, error: err?.message || String(err) });
    }
    count++;
    // Pause after every 5 successful/unsuccessful attempts except after last
    if (count % 5 === 0 && count < accounts.length) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return res.status(200).json({ results });
}