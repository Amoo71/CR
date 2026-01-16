/**
 * API proxy to fetch accounts from justpaste.it and bypass CORS
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://justpaste.it/nia8c');
    const html = await response.text();
    
    // Extract just the text content, looking for email:password patterns
    // The HTML structure has the content in various places
    const emailPasswordRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})[\s:]+([^\s<]+)/g;
    const matches = [];
    let match;
    
    while ((match = emailPasswordRegex.exec(html)) !== null) {
      matches.push({
        email: match[1],
        password: match[2]
      });
    }
    
    return res.status(200).json({ accounts: matches });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch accounts' });
  }
}
