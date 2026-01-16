import cr from 'crunchyroll.js';

/**
 * API route handler for retrieving the Crunchyroll user profile. The route accepts
 * a POST request with JSON containing `email`, `password` and an optional
 * `region` string. It logs in using crunchyroll.js and returns the profile
 * information. On any error (e.g., invalid credentials), an error message
 * is returned with a 500 status code.
 *
 * Note: This route uses the inofficial crunchyroll.js package. Using it may
 * violate Crunchyroll’s terms of service. Use at your own risk.
 *
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, region } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'E‑Mail und Passwort sind erforderlich' });
  }

  try {
    // Log in to Crunchyroll; pass region if provided
    await cr.login(email, password, region || undefined);
    const profile = await cr.getProfile();
    // Optionally log out to clean up session (not required by the library)
    return res.status(200).json({ profile });
  } catch (err) {
    // The error thrown by crunchyroll.js is often an Error instance
    return res.status(500).json({ error: err?.message || String(err) });
  }
}