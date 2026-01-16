import cr from 'crunchyroll.js';

/**
 * API route to check a SINGLE account only.
 * The crunchyroll.js library has a session caching issue - each request
 * should be completely isolated but Vercel may reuse function instances.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, region } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Login with credentials
    await cr.login(email, password, region || undefined);
    
    // Get profile
    const profile = await cr.getProfile();
    
    // Logout
    try {
      await cr.logout();
    } catch (err) {
      // Ignore logout errors
    }
    
    // When the profile contains an error code we treat it as invalid
    if (profile && typeof profile === 'object' && profile.code) {
      return res.status(200).json({ 
        email, 
        password, 
        ok: false, 
        errorCode: profile.code, 
        error: profile.code 
      });
    } else {
      return res.status(200).json({ 
        email, 
        password, 
        ok: true, 
        profile 
      });
    }
  } catch (err) {
    return res.status(200).json({ 
      email, 
      password, 
      ok: false, 
      errorCode: err?.code, 
      error: err?.message || String(err) 
    });
  }
}
