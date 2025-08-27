import cheerio from 'cheerio';

const SOURCES = [
  // public RSS or simple pages. These are examples — some may fail if site blocks scraping.
  { id: 'remoteok', type: 'rss', url: 'https://remoteok.com/remote-jobs.rss' },
  { id: 'wellfound', type: 'rss', url: 'https://wellfound.com/feed' }, // may vary
  // add company career pages here (type:'company')
  { id: 'example', type: 'company', url: 'https://example.com/careers' }
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'JobSnoop/1.0 (+https://example.com)' } });
  if (!res.ok) throw new Error('Fetch failed ' + res.status);
  return await res.text();
}

async function fetchRSS(url) {
  const text = await fetchText(url);
  const $ = cheerio.load(text, { xmlMode: true });
  const items = [];
  $('item').each((i, el) => {
    items.push({
      title: $(el).find('title').text(),
      link: $(el).find('link').text(),
      description: $(el).find('description').text()
    });
  });
  return items;
}

async function heuristicSearch(url, qtext) {
  const text = await fetchText(url);
  const $ = cheerio.load(text);
  const out = [];
  $('a').each((i, el) => {
    const txt = $(el).text().trim();
    const href = $(el).attr('href');
    if (!href) return;
    const low = txt.toLowerCase();
    if (low.includes('job') || low.includes('career') || low.includes('opening') || (qtext && low.includes(qtext.toLowerCase()))) {
      try {
        out.push({ title: txt || href, link: new URL(href, url).href });
      } catch(e) {
        out.push({ title: txt || href, link: href });
      }
    }
  });
  return out.slice(0, 40);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { query = '', city = '' } = req.body || {};
    const candidates = [];

    for (const src of SOURCES) {
      try {
        if (src.type === 'rss') {
          const items = await fetchRSS(src.url);
          items.forEach(it => candidates.push({ ...it, source: src.id }));
        } else if (src.type === 'company') {
          const items = await heuristicSearch(src.url, query);
          items.forEach(it => candidates.push({ ...it, source: src.id }));
        }
      } catch (e) {
        // ignore per-source errors
        console.error('source error', src.id, e.message);
      }
    }

    const filtered = candidates.filter(c => {
      if (query && !((c.title || '').toLowerCase().includes(query.toLowerCase()) || (c.description || '').toLowerCase().includes(query.toLowerCase()))) return false;
      if (city && !((c.location || '').toLowerCase().includes(city.toLowerCase()))) return false;
      return true;
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({ ok:true, results: filtered.slice(0,150) }));
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error: ' + (err.message || String(err)));
  }
}
