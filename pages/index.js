import { useState } from 'react';

/**
 * A minimal, modern interface for managing many Crunchyroll accounts. Users can
 * paste credentials into the single input field at the bottom of the page in
 * almost any format. The component extracts email/password pairs, displays
 * them above the input as compact, rounded items and automatically checks
 * each account via an API route. Valid accounts turn green and display
 * their username; invalid accounts turn red. Clicking an item reveals a
 * popup with the account’s email and password along with a copy button.
 */
export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeId, setActiveId] = useState(null);
  // Unique IDs for list items are generated using array indices and labels;

  /**
   * Extracts account pairs from a string. Accepts patterns like
   * `email:password` or `email password`. Extra surrounding text is ignored.
   * @param {string} text
   * @returns {Array<{email: string, password: string}>}
   */
  function parseAccounts(text) {
    const regex = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?:[:\s]+([^\s]+))?/g;
    const result = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const email = match[1];
      const password = match[2];
      if (email && password) {
        result.push({ email, password });
      }
    }
    return result;
  }

  /**
   * Recursively searches an object for a property whose key contains
   * `username`. Returns the first matching string it finds.
   * @param {any} obj
   */
  function findUsername(obj) {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string' && key.toLowerCase().includes('username')) {
        return value;
      }
      if (typeof value === 'object') {
        const nested = findUsername(value);
        if (nested) return nested;
      }
    }
    return null;
  }

  /**
   * Sends an account to the API to check its validity. Updates the account
   * state when the response arrives.
   * @param {number} index Index of the account in the state array
   * @param {{email: string, password: string}} account
   */
  async function checkAccount(index, account) {
    try {
      const res = await fetch('/api/checkAccounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: [account] }),
      });
      const data = await res.json();
      const result = data.results && data.results[0];
      setAccounts((prev) => {
        const updated = [...prev];
        if (!result) {
          updated[index] = { ...updated[index], status: 'invalid', error: 'No response' };
          return updated;
        }
        if (result.ok) {
          const username = findUsername(result.profile) || updated[index].label;
          updated[index] = {
            ...updated[index],
            status: 'valid',
            profileName: username,
            error: null,
          };
        } else {
          // Check for specific error code indicating invalid auth token
          const code = result.errorCode || result.error;
          updated[index] = {
            ...updated[index],
            status: code === 'accounts.get_profile.invalid_auth_token' ? 'invalid' : 'invalid',
            error: code,
          };
        }
        return updated;
      });
    } catch (err) {
      setAccounts((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'invalid', error: err.message };
        return updated;
      });
    }
  }

  /**
   * Handles the Enter key in the input field: parses accounts, adds them to
   * state and triggers checking.
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAccountsFromInput();
    }
  }

  /**
   * Parses the current input value and appends new accounts to the list. Then
   * clears the input and checks each newly added account.
   */
  function addAccountsFromInput() {
    const text = inputValue.trim();
    if (!text) return;
    const pairs = parseAccounts(text);
    setInputValue('');
    if (pairs.length === 0) return;
    setAccounts((prev) => {
      const updated = [...prev];
      pairs.forEach((pair) => {
        const label = `Acc${updated.length + 1}`;
        updated.push({ id: label, email: pair.email, password: pair.password, label, status: 'checking', profileName: null, error: null });
      });
      return updated;
    });
    // Check each newly added account
    pairs.forEach((pair, idx) => {
      const index = accounts.length + idx;
      checkAccount(index, pair);
    });
  }

  /**
   * Handles clicking on a list item: toggles visibility of details for that
   * account.
   * @param {string} id
   */
  function toggleDetails(id) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  /**
   * Copies the account credentials to the clipboard.
   */
  function copyCredentials(acc) {
    const text = `${acc.email}:${acc.password}`;
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback: create a temporary input element
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  }

  /**
   * Clears all stored accounts and hides any open details popups.
   */
  function clearAll() {
    setAccounts([]);
    setActiveId(null);
  }

  // Retrieve the active account object based on activeId
  const activeAccount = accounts.find((acc) => acc.id === activeId);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Crunchyroll Account Manager</h1>
      <ul style={styles.list}>
        {accounts.map((acc) => (
          <li
            key={acc.id}
            onClick={() => toggleDetails(acc.id)}
            style={{
              ...styles.accountItem,
              backgroundColor:
                acc.status === 'valid'
                  ? 'rgba(76, 175, 80, 0.25)'
                  : acc.status === 'invalid'
                  ? 'rgba(244, 67, 54, 0.25)'
                  : 'rgba(255, 255, 255, 0.05)',
              borderColor:
                acc.status === 'valid'
                  ? '#4caf50'
                  : acc.status === 'invalid'
                  ? '#f44336'
                  : 'rgba(255, 255, 255, 0.2)',
            }}
          >
            {acc.status === 'valid' && acc.profileName ? acc.profileName : acc.label}
          </li>
        ))}
      </ul>
      {accounts.length > 0 && (
        <button
          onClick={clearAll}
          style={{ ...styles.button, backgroundColor: '#f44336', marginBottom: '1rem' }}
        >
          Delete all
        </button>
      )}
      {activeAccount && (
        <div style={styles.popup}>
          <p style={{ margin: 0, marginBottom: '0.5rem' }}>
            <strong>{activeAccount.profileName || activeAccount.label}</strong>
          </p>
          <p style={{ margin: 0, marginBottom: '0.5rem' }}>{activeAccount.email}</p>
          <p style={{ margin: 0, marginBottom: '0.5rem' }}>Password: {activeAccount.password}</p>
          <button
            onClick={() => copyCredentials(activeAccount)}
            style={{ ...styles.button, width: '100%' }}
          >
            Copy credentials
          </button>
        </div>
      )}
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste credentials and press Enter…"
          style={styles.inputField}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    padding: '2rem 1rem',
    color: '#f5f5f5',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  title: {
    marginBottom: '1rem',
    fontSize: '1.5rem',
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    width: '100%',
    maxWidth: '600px',
    marginBottom: '2rem',
    padding: 0,
    listStyle: 'none',
  },
  accountItem: {
    padding: '0.5rem 0.75rem',
    borderRadius: '9999px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    userSelect: 'none',
    fontSize: '0.9rem',
  },
  popup: {
    position: 'fixed',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
    color: '#f5f5f5',
    zIndex: 1000,
    width: '280px',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: '600px',
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255,255,255,0.2)',
    backdropFilter: 'blur(10px)',
    borderRadius: '30px',
    padding: '0.5rem 1rem',
    boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
  },
  inputField: {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#f5f5f5',
    fontSize: '1rem',
  },
  button: {
    padding: '0.5rem',
    backgroundColor: '#ff751a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};