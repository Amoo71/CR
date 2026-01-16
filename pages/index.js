import { useState, useEffect, useRef } from 'react';

/**
 * SoftRoll Hub - A modern dark glassy macOS-style interface for managing 
 * Crunchyroll accounts. Auto-loads accounts from justpaste.it/nia8c and 
 * provides checking functionality with beautiful UI.
 */
export default function Home() {
  const [accounts, setAccounts] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const popupRef = useRef(null);
  const modalRef = useRef(null);
  // Unique IDs for list items are generated using array indices and labels;

  /**
   * Fetch accounts from justpaste.it/nia8c on component mount
   */
  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch('/api/fetchAccounts');
        const data = await response.json();
        
        if (data.accounts && data.accounts.length > 0) {
          // Remove duplicates based on email
          const uniqueAccounts = [];
          const seenEmails = new Set();
          
          for (const pair of data.accounts) {
            if (!seenEmails.has(pair.email)) {
              seenEmails.add(pair.email);
              uniqueAccounts.push(pair);
            }
          }
          
          const newAccounts = uniqueAccounts.map((pair, idx) => ({
            id: `Acc${idx + 1}`,
            email: pair.email,
            password: pair.password,
            label: `Acc${idx + 1}`,
            status: 'checking',
            profileName: null,
            error: null,
          }));
          setAccounts(newAccounts);
          
          // Check accounts sequentially to avoid session conflicts
          checkAccountsSequentially(newAccounts);
        }
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAccounts();
  }, []);

  /**
   * Handle clicks outside popup to close it
   */
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        // Check if click is on an account item
        const isAccountItem = event.target.closest('[data-account-item]');
        if (!isAccountItem) {
          setActiveId(null);
        }
      }
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        const isModalButton = event.target.closest('[data-modal-button]');
        if (!isModalButton) {
          setShowCustomModal(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
   * `username` or common profile name fields. Returns the first matching string it finds.
   * @param {any} obj
   */
  function findUsername(obj) {
    if (!obj || typeof obj !== 'object') return null;
    
    // Try common username fields first
    const commonFields = ['username', 'Username', 'name', 'displayName', 'display_name', 'account_id', 'email'];
    for (const field of commonFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field];
      }
    }
    
    // Recursively search nested objects
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string' && (key.toLowerCase().includes('username') || key.toLowerCase().includes('name'))) {
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
   * Check accounts one by one sequentially to avoid session conflicts
   */
  async function checkAccountsSequentially(accountsToCheck) {
    for (let i = 0; i < accountsToCheck.length; i++) {
      const acc = accountsToCheck[i];
      await checkAccount(i, { email: acc.email, password: acc.password });
      // Longer delay between checks to ensure session cleanup
      if (i < accountsToCheck.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * Sends an account to the API to check its validity. Updates the account
   * state when the response arrives.
   * @param {number} index Index of the account in the state array
   * @param {{email: string, password: string}} account
   */
  async function checkAccount(index, account) {
    try {
      const res = await fetch('/api/checkSingleAccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password }),
      });
      const result = await res.json();
      console.log(`[${index}] Response for ${account.email}:`, result);
      setAccounts((prev) => {
        const updated = [...prev];
        // Make sure the account at this index still exists
        if (!updated[index]) {
          return updated;
        }
        if (!result) {
          console.log(`[${index}] No result for ${updated[index].email}`);
          updated[index] = { 
            ...updated[index], 
            status: 'invalid', 
            profileName: null,
            error: 'No response' 
          };
          return updated;
        }
        if (result.ok) {
          const username = findUsername(result.profile);
          console.log(`[${index}] VALID - Email: ${updated[index].email}, Username found: ${username}`);
          updated[index] = {
            ...updated[index],
            status: 'valid',
            profileName: username || updated[index].label,
            error: null,
          };
        } else {
          // Check for specific error code indicating invalid auth token
          const code = result.errorCode || result.error;
          console.log(`[${index}] INVALID - Email: ${updated[index].email}, Error: ${code}`);
          updated[index] = {
            ...updated[index],
            status: 'invalid',
            profileName: null,
            error: code,
          };
        }
        return updated;
      });
    } catch (err) {
      setAccounts((prev) => {
        const updated = [...prev];
        if (!updated[index]) {
          return updated;
        }
        updated[index] = { 
          ...updated[index], 
          status: 'invalid', 
          profileName: null,
          error: err.message 
        };
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

  /**
   * Handles checking custom accounts from modal
   */
  function handleCustomCheck() {
    const text = customInput.trim();
    if (!text) return;
    
    const pairs = parseAccounts(text);
    if (pairs.length === 0) return;
    
    const startIdx = accounts.length;
    const newAccounts = pairs.map((pair, idx) => ({
      id: `Custom${startIdx + idx + 1}`,
      email: pair.email,
      password: pair.password,
      label: `Custom${startIdx + idx + 1}`,
      status: 'checking',
      profileName: null,
      error: null,
    }));
    
    setAccounts((prev) => [...prev, ...newAccounts]);
    setCustomInput('');
    setShowCustomModal(false);
    
    // Check the new accounts sequentially
    checkAccountsSequentially(newAccounts.map((acc, idx) => ({
      ...acc,
      index: startIdx + idx
    })));
  }

  /**
   * Recheck all accounts - reload the page to fetch fresh data
   */
  function handleRecheck() {
    window.location.reload();
  }

  // Retrieve the active account object based on activeId
  const activeAccount = accounts.find((acc) => acc.id === activeId);

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.animatedBg}></div>
      
      {/* Title at top */}
      <h1 style={styles.title}>SoftRoll Hub</h1>
      
      {/* Navbar with buttons */}
      <div style={styles.navbar}>
        <button
          data-modal-button
          onClick={() => setShowCustomModal(true)}
          style={styles.navButton}
        >
          Check my Own!
        </button>
        <button
          onClick={handleRecheck}
          style={styles.navButton}
        >
          ReCheck
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div style={styles.loadingText}>Loading accounts...</div>
      )}

      {/* Account list */}
      <ul style={styles.list}>
        {accounts.map((acc) => (
          <li
            key={acc.id}
            data-account-item
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

      {/* Delete all button */}
      {accounts.length > 0 && (
        <button
          onClick={clearAll}
          style={{ ...styles.button, backgroundColor: '#f44336', marginTop: '1rem' }}
        >
          Delete all
        </button>
      )}

      {/* Account details popup */}
      {activeAccount && (
        <div ref={popupRef} style={styles.popup}>
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

      {/* Custom input modal */}
      {showCustomModal && (
        <div style={styles.modalOverlay}>
          <div ref={modalRef} style={styles.modal}>
            <h2 style={styles.modalTitle}>Check Your Own Accounts</h2>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Paste your credentials here (email:password format)..."
              style={styles.modalTextarea}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={handleCustomCheck}
                style={{ ...styles.button, backgroundColor: '#4caf50', flex: 1 }}
              >
                Check Now
              </button>
              <button
                onClick={() => setShowCustomModal(false)}
                style={{ ...styles.button, backgroundColor: '#666', flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: '100vh',
    backgroundColor: '#000',
    padding: '2rem 1rem',
    color: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  animatedBg: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at 20% 30%, rgba(40, 40, 50, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(30, 30, 40, 0.3) 0%, transparent 50%), linear-gradient(180deg, #000 0%, #0a0a0a 100%)',
    animation: 'gradientShift 8s ease-in-out infinite',
    zIndex: 0,
  },
  title: {
    marginTop: '1rem',
    marginBottom: '1.5rem',
    fontSize: '2.5rem',
    fontWeight: '600',
    letterSpacing: '-0.02em',
    zIndex: 1,
    background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  navbar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '2rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '0.5rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    zIndex: 1,
  },
  navButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '1rem',
    marginBottom: '1rem',
    zIndex: 1,
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '1rem',
    padding: 0,
    listStyle: 'none',
    zIndex: 1,
  },
  accountItem: {
    padding: '0.6rem 1rem',
    borderRadius: '20px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    userSelect: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  popup: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    color: '#f5f5f5',
    zIndex: 2000,
    width: '320px',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
  },
  modal: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    width: '90%',
    maxWidth: '500px',
  },
  modalTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#fff',
  },
  modalTextarea: {
    width: '100%',
    minHeight: '150px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '1rem',
    color: '#fff',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    marginBottom: '1rem',
  },
  modalButtons: {
    display: 'flex',
    gap: '0.75rem',
  },
  button: {
    padding: '0.75rem 1rem',
    backgroundColor: '#ff751a',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
};