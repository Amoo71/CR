import { useState } from 'react';

/**
 * Home page component. Displays a form for entering Crunchyroll credentials
 * and fetches the user's profile via the API route. This component uses
 * client‑side state to manage form input and to display either the resulting
 * profile data or an error if the request fails.
 */
export default function Home() {
  // Single account credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [region, setRegion] = useState('');
  // Single account result
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Multiple accounts management
  const [showAccountsInput, setShowAccountsInput] = useState(false);
  const [accountsText, setAccountsText] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [checkingAccounts, setCheckingAccounts] = useState(false);

  /**
   * Parses the accountsText and extracts email:password pairs using a regex.
   * Populates the accounts state with objects containing email, password and status.
   */
  const parseAccounts = () => {
    const regex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}):([^\s]+)/g;
    const found = [];
    let match;
    while ((match = regex.exec(accountsText)) !== null) {
      const email = match[1];
      const pass = match[2];
      found.push({ email, password: pass, status: 'untested', profile: null, error: null });
    }
    setAccounts(found);
  };

  /**
   * Submits the single account form; fetches profile via API.
   */
  async function handleSubmit(e) {
    e.preventDefault();
    setProfile(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unexpected error');
      }
      setProfile(data.profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Checks all parsed accounts by sending them to the API. Updates each account's
   * status based on whether login and profile retrieval succeeds.
   */
  async function handleCheckAccounts() {
    setCheckingAccounts(true);
    try {
      const res = await fetch('/api/checkAccounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accounts, region }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Prüfen der Konten');
      }
      // Merge results back into accounts
      const updated = accounts.map((acc) => {
        const result = data.results.find((r) => r.email === acc.email && r.password === acc.password);
        return {
          ...acc,
          status: result.ok ? 'ok' : 'Error',
          profile: result.ok ? result.profile : null,
          error: result.ok ? null : result.error,
        };
      });
      setAccounts(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setCheckingAccounts(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1>Crunchyroll Account&nbsp;Manager</h1>
      <p>
        This tool uses the unofficial npm package&nbsp;
        <a href="https://github.com/Mssjim/crunchyroll.js" target="_blank" rel="noopener noreferrer">crunchyroll.js</a>
        to interact with the Crunchyroll API. Be aware that using this package may violate Crunchyroll’s Terms of Service;
        you use this tool at your own risk.
      </p>

      {/* Single account form */}
      <h2>Test a single account</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label htmlFor="region">Region (optional)</label>
          <input
            id="region"
            type="text"
            placeholder="z.B. de-DE oder pt-BR"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={styles.input}
          />
        </div>
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Loading…' : 'Retrieve profile'}
        </button>
      </form>
      {error && <p style={{ color: '#ff6b6b' }}>Error: {error}</p>}
      {profile && (
        <div style={styles.profileBox}>
          <h3>Profile</h3>
          <pre style={styles.pre}>{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}

      {/* Multiple accounts section */}
      <hr style={{ margin: '2rem 0', borderColor: 'rgba(255,255,255,0.1)' }} />
      <h2>Manage multiple accounts</h2>
      <button
        type="button"
        onClick={() => setShowAccountsInput((v) => !v)}
        style={{ ...styles.button, backgroundColor: '#0066cc' }}
      >
        {showAccountsInput ? 'Hide input' : 'Enter accounts'}
      </button>
      {showAccountsInput && (
        <div style={{ marginTop: '1rem' }}>
          <textarea
            value={accountsText}
            onChange={(e) => setAccountsText(e.target.value)}
            placeholder="Paste your data here (e.g. some text mail@example.com:password other text)"
            rows={6}
            style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f5f5f5', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px' }}
          />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={parseAccounts} style={styles.button}>
              Parse accounts
            </button>
            <button
              type="button"
              onClick={handleCheckAccounts}
              disabled={accounts.length === 0 || checkingAccounts}
              style={{ ...styles.button, backgroundColor: '#2a9d8f' }}
            >
              {checkingAccounts ? 'Testing…' : 'Test accounts'}
            </button>
          </div>
        </div>
      )}
      {accounts.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Found accounts ({accounts.length})</h3>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {accounts.map((acc, idx) => (
              <li
                key={`${acc.email}-${idx}`}
                style={{
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#f5f5f5',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <strong>{acc.email}</strong>: {acc.status}
                {acc.error && <span style={{ color: '#ff6b6b' }}> – {acc.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.5,
    color: '#f5f5f5',
    backgroundColor: '#0a0a0a',
    minHeight: '100vh',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1rem',
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  input: {
    padding: '0.5rem',
    fontSize: '1rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    color: '#f5f5f5',
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#ff751a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  profileBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    color: '#f5f5f5',
  },
  pre: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'auto',
  },
};