const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#58;|&colon;/gi, ':')
    .replace(/&#x3a;/gi, ':')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  );
}

export function parseAccountsFromText(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const accounts = [];

  for (const line of lines) {
    const emailMatch = line.match(EMAIL_REGEX);
    if (!emailMatch) continue;

    const email = emailMatch[0];
    const rest = line.slice(emailMatch.index + email.length).trim();

    if (!rest) continue;

    const password = rest
      .replace(/^[:\s]+/, '')
      .split(/\s+/)[0]
      .trim();

    if (!password) continue;

    accounts.push({ email, password });
  }

  return accounts;
}

export function parseAccountsFromHtml(html) {
  const plainText = htmlToText(html);
  const fromText = parseAccountsFromText(plainText);

  if (fromText.length > 0) {
    return fromText;
  }

  // Fallback for compact formats where delimiters can be either ':' or whitespace
  const fallbackRegex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*(?::|\s)\s*([^\s<]+)/g;
  const accounts = [];
  let match;

  while ((match = fallbackRegex.exec(html)) !== null) {
    accounts.push({ email: match[1], password: match[2] });
  }

  return accounts;
}
