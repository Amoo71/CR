/**
 * API proxy to fetch accounts from justpaste.it and bypass CORS
 */
import { parseAccountsFromHtml } from '../../lib/parseAccounts';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://justpaste.it/nia8c', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SoftRollHub/1.0; +https://justpaste.it)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to load source page (${response.status})` });
    }

    const html = await response.text();
    const accounts = parseAccountsFromHtml(html);

    return res.status(200).json({ accounts });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch accounts' });
  }
}
