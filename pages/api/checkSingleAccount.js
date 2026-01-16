/**
 * API route to check a SINGLE account only.
 * Uses dynamic import and forced cache busting to avoid session conflicts.
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
    // Force cache busting by adding timestamp to import
    const timestamp = Date.now();
    const modulePath = 'crunchyroll.js';
    
    // Delete all cached versions
    Object.keys(require.cache).forEach(key => {
      if (key.includes('crunchyroll')) {
        delete require.cache[key];
      }
    });
    
    // Use require for immediate execution
    const cr = require(modulePath);
    
    // Add delay before login
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await cr.login(email, password, region || undefined);
    const profile = await cr.getProfile();
    
    // Logout immediately and wait for it
    try {
      await cr.logout();
      // Extra delay after logout to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      // Ignore logout errors but still wait
      await new Promise(resolve => setTimeout(resolve, 300));
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
