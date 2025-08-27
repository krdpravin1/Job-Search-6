import React, { useState } from 'react'

export default function App() {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');

  async function onSearch(e) {
    e && e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city })
      });
      if (!res.ok) {
        const txt = await res.text();
        setMessage('Server error: ' + txt);
        setResults([]);
      } else {
        const j = await res.json();
        if (j.ok) setResults(j.results || []);
        else setMessage('No results or server returned an error.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Network error — check console.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Job Snoop</h1>
        <p className="sub">Minimal, realtime job search (no DB). Deployed as a single Vercel repo.</p>
      </header>

      <form onSubmit={onSearch} className="searchRow">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Skill, function, title" />
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="City (optional)" style={{width:180}}/>
        <button type="submit">{loading ? 'Searching...' : 'Search'}</button>
      </form>

      {message && <div className="msg">{message}</div>}

      <div className="results">
        <div className="count">{results.length} results</div>
        <ul>
          {results.map((r, i) => (
            <li key={i} className="card">
              <a href={r.link || '#'} target="_blank" rel="noreferrer">
                <div className="row">
                  <strong>{r.title}</strong>
                  <small className="src">{r.source}</small>
                </div>
                <div className="meta">{r.company || ''} {r.location ? `· ${r.location}` : ''}</div>
                <div className="desc">{(r.description || r.summary || '').slice(0,200)}</div>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer>
        <small>Use responsibly. Some sites may block scraping.</small>
      </footer>
    </div>
  )
}
