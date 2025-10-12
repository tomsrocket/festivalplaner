import React, { useState } from 'react';

function MyNavBar() {
  const [copied, setCopied] = useState(false);
  const storageKey = 'likedFestivals2026';

  const shareLiked = async () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids || ids.length === 0) {
        // nothing to share
        alert('Du hast noch keine Festivals geliked.');
        return;
      }

      const encoded = ids.map(encodeURIComponent).join(',');
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      try {
        await navigator.clipboard.writeText(url);
      } catch (e) {
        // fallback
        window.prompt('Link zum Teilen (kopieren):', url);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Fehler beim Erstellen des Share-Links', e);
      alert('Konnte Link nicht erstellen.');
    }
  };

  const [open, setOpen] = useState(false);

  return (
    <nav className="navbar navbar-expand-lg bg-dark navbar-dark">
      <div className="container">
        <a className="navbar-brand" href="/">Termininator</a>
        <button className="navbar-toggler" type="button" onClick={() => setOpen((s) => !s)} aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse ${open ? 'show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><a className="nav-link" href="/">Home</a></li>
            <li className="nav-item"><a className="nav-link" href="/festivals">Festivalplaner</a></li>
            <li className="nav-item"><a className="nav-link" href="/calendar">Kalenderübersicht</a></li>
            <li className="nav-item"><a className="nav-link" target="_blank" href="https://www.input23.de/impressum.html">Impressum</a></li>
          </ul>

          <div className="d-flex align-items-center">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={shareLiked}>Teilen</button>
            {copied && <span style={{ marginLeft: 8, color: 'green' }}>kopiert</span>}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default MyNavBar;