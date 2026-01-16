import cr from 'crunchyroll.js';

/**
 * API route to check a SINGLE account only.
 * This ensures no session conflicts between accounts.
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
    // Force a small delay to ensure previous requests are done
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await cr.login(email, password, region || undefined);
    const profile = await cr.getProfile();
    
    // Logout immediately and wait for it
    try {
      await cr.logout();
      // Extra delay after logout
      await new Promise(resolve => setTimeout(resolve, 200));
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
