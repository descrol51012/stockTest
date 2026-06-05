const indices = [
  { symbol: '^DJI', cnbc: '.DJI', stooq: 'dji.us', name: '道瓊指數', short: 'Dow Jones' },
  { symbol: '^IXIC', cnbc: '.IXIC', stooq: 'ixic.us', name: '納斯達克指數', short: 'Nasdaq' },
  { symbol: '^SOX', cnbc: '.SOX', stooq: 'sox.us', name: '費城半導體指數', short: 'PHLX SOX' },
  { symbol: '^GSPC', cnbc: '.SPX', stooq: 'spx.us', name: '標普 500 指數', short: 'S&P 500' }
];

const sectors = [
  {
    title: 'AI 晶片與加速器',
    icon: 'cpu',
    accent: 'blue',
    summary: 'GPU、AI ASIC、CPU 與資料中心加速器核心供應商。',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA', role: 'GPU' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', role: 'GPU/CPU' },
      { symbol: 'AVGO', name: 'Broadcom', role: 'ASIC/網通' },
      { symbol: 'INTC', name: 'Intel', role: 'CPU/晶圓代工' },
      { symbol: 'QCOM', name: 'Qualcomm', role: 'Edge AI' },
      { symbol: 'ARM', name: 'Arm Holdings', role: 'IP 架構' }
    ]
  },
  {
    title: '雲端與 AI 平台',
    icon: 'cloud',
    accent: 'teal',
    summary: '大型雲端、模型服務、企業 AI 軟體與資料平台。',
    stocks: [
      { symbol: 'MSFT', name: 'Microsoft', role: 'Azure/OpenAI' },
      { symbol: 'GOOGL', name: 'Alphabet', role: 'Gemini/TPU' },
      { symbol: 'AMZN', name: 'Amazon', role: 'AWS' },
      { symbol: 'META', name: 'Meta Platforms', role: 'AI Infra' },
      { symbol: 'ORCL', name: 'Oracle', role: '雲端資料庫' },
      { symbol: 'PLTR', name: 'Palantir', role: 'AI 軟體' }
    ]
  },
  {
    title: '半導體設備與 EDA',
    icon: 'factory',
    accent: 'amber',
    summary: 'AI 晶片製造所需的設備、量測、材料與設計工具。',
    stocks: [
      { symbol: 'ASML', name: 'ASML Holding', role: 'EUV' },
      { symbol: 'AMAT', name: 'Applied Materials', role: '製程設備' },
      { symbol: 'LRCX', name: 'Lam Research', role: '蝕刻/沉積' },
      { symbol: 'KLAC', name: 'KLA', role: '檢測量測' },
      { symbol: 'SNPS', name: 'Synopsys', role: 'EDA' },
      { symbol: 'CDNS', name: 'Cadence', role: 'EDA' }
    ]
  },
  {
    title: '記憶體、儲存與電源散熱',
    icon: 'server',
    accent: 'rose',
    summary: 'HBM、DRAM、儲存、伺服器電源與散熱受惠鏈。',
    stocks: [
      { symbol: 'MU', name: 'Micron', role: 'HBM/DRAM' },
      { symbol: 'WDC', name: 'Western Digital', role: '儲存' },
      { symbol: 'STX', name: 'Seagate', role: '儲存' },
      { symbol: 'VRT', name: 'Vertiv', role: '電源/散熱' },
      { symbol: 'DELL', name: 'Dell Technologies', role: 'AI 伺服器' },
      { symbol: 'HPE', name: 'Hewlett Packard Enterprise', role: 'AI 伺服器' }
    ]
  }
];

const quoteState = new Map();
const newsState = new Map();

const marketGrid = document.getElementById('market-grid');
const sectorGrid = document.getElementById('sector-grid');
const template = document.getElementById('quote-card-template');
const statusDot = document.getElementById('feed-dot');
const statusText = document.getElementById('feed-status');
const updatedAt = document.getElementById('updated-at');

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '--';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function formatSigned(value, suffix = '') {
  if (!Number.isFinite(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}${suffix}`;
}

function changeClass(value) {
  if (value > 0) return 'price-up';
  if (value < 0) return 'price-down';
  return 'price-flat';
}

function setStatus(message, mode = 'live') {
  statusText.textContent = message;
  statusDot.className = `status-dot ${mode}`;
}

function yahooQuoteUrl(symbol) {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
}

function cnbcQuoteUrl(items) {
  const symbols = items.map((item) => item.cnbc || item.symbol).join('|');
  return `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${encodeURIComponent(symbols)}&requestMethod=quick&fund=1&exthrs=1&output=json`;
}

function yahooNewsUrl(symbol) {
  return `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
}

function yahooSearchNewsUrl(symbol) {
  return `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=5&quotesCount=0`;
}

async function fetchQuote(symbol) {
  const res = await fetch(yahooQuoteUrl(symbol));
  if (!res.ok) throw new Error(`quote ${symbol} ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || !Number.isFinite(meta.regularMarketPrice)) throw new Error(`quote ${symbol} empty`);
  const previous = meta.chartPreviousClose ?? meta.previousClose;
  const price = meta.regularMarketPrice;
  const change = Number.isFinite(previous) ? price - previous : 0;
  const changePercent = previous ? (change / previous) * 100 : 0;
  return {
    price,
    previous,
    change,
    changePercent,
    currency: meta.currency || 'USD',
    time: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date()
  };
}

async function fetchStooqQuote(item) {
  const stooqSymbol = item.stooq || `${item.symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`stooq ${item.symbol} ${res.status}`);
  const text = await res.text();
  const [, row] = text.trim().split(/\r?\n/);
  const cells = row?.split(',') || [];
  const close = Number(cells[6]);
  const open = Number(cells[3]);
  if (!Number.isFinite(close)) throw new Error(`stooq ${item.symbol} empty`);
  const change = Number.isFinite(open) ? close - open : 0;
  return {
    price: close,
    previous: open,
    change,
    changePercent: open ? (change / open) * 100 : 0,
    currency: 'USD',
    time: new Date()
  };
}

function parseMarketNumber(value) {
  if (value === null || value === undefined) return NaN;
  const normalized = String(value).replace(/,/g, '').replace(/%/g, '').replace(/\+/g, '').trim();
  if (!normalized || normalized.toUpperCase() === 'UNCH') return 0;
  return Number(normalized);
}

function normalizeCnbcQuote(raw) {
  if (!raw || Number(raw.code) !== 0) return null;
  const price = parseMarketNumber(raw.last);
  if (!Number.isFinite(price)) return null;
  const change = parseMarketNumber(raw.change);
  const changePercent = parseMarketNumber(raw.change_pct);
  return {
    price,
    previous: Number.isFinite(change) ? price - change : NaN,
    change: Number.isFinite(change) ? change : 0,
    changePercent: Number.isFinite(changePercent) ? changePercent : 0,
    currency: raw.currencyCode || 'USD',
    source: 'CNBC',
    time: new Date()
  };
}

async function fetchCnbcQuotes(items) {
  const res = await fetch(cnbcQuoteUrl(items), {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`cnbc quotes ${res.status}`);
  const json = await res.json();
  const quotes = json.FormattedQuoteResult?.FormattedQuote;
  const rows = Array.isArray(quotes) ? quotes : quotes ? [quotes] : [];
  const byRequestedSymbol = new Map();
  rows.forEach((row) => {
    const quote = normalizeCnbcQuote(row);
    if (!quote) return;
    const requested = items.find((item) => (item.cnbc || item.symbol).toUpperCase() === String(row.symbol).toUpperCase());
    if (requested) byRequestedSymbol.set(requested.symbol, quote);
  });
  return byRequestedSymbol;
}

async function getQuote(item) {
  try {
    const quotes = await fetchCnbcQuotes([item]);
    const quote = quotes.get(item.symbol);
    if (quote) return quote;
    throw new Error(`cnbc ${item.symbol} empty`);
  } catch (cnbcError) {
    try {
      return await fetchQuote(item.symbol);
    } catch (primaryError) {
      try {
        return await fetchStooqQuote(item);
      } catch (fallbackError) {
        throw cnbcError;
      }
    }
  }
}

async function fetchNews(symbol) {
  try {
    const res = await fetch(yahooSearchNewsUrl(symbol));
    if (!res.ok) throw new Error(`news ${symbol} ${res.status}`);
    const json = await res.json();
    const news = Array.isArray(json.news) ? json.news : [];
    if (!news.length) throw new Error(`news ${symbol} empty`);
    return news.slice(0, 5).map((item) => ({
      title: item.title || '未命名新聞',
      link: item.link || `https://finance.yahoo.com/quote/${symbol}/news`,
      source: item.publisher || 'Yahoo Finance',
      date: item.providerPublishTime ? new Date(item.providerPublishTime * 1000) : null
    }));
  } catch (primaryError) {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(yahooNewsUrl(symbol))}`;
    const res = await fetch(url);
    if (!res.ok) throw primaryError;
    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    return items.slice(0, 5).map((item) => ({
      title: item.title || '未命名新聞',
      link: item.link || `https://finance.yahoo.com/quote/${symbol}/news`,
      source: item.author || 'Yahoo Finance',
      date: item.pubDate ? new Date(item.pubDate) : null
    }));
  }
}

function renderMarketShell() {
  marketGrid.innerHTML = indices.map((item) => `
    <article class="quote-card rounded-lg border p-4" data-index="${item.symbol}">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-muted font-mono text-xs font-black">${item.short}</p>
          <h3 class="text-primary mt-1 text-base font-black">${item.name}</h3>
        </div>
        <i data-lucide="activity" class="text-muted h-5 w-5"></i>
      </div>
      <div class="mt-5 flex items-end justify-between">
        <p class="index-price text-primary font-mono text-2xl font-black">--</p>
        <p class="index-change font-mono text-sm font-black price-flat">--</p>
      </div>
    </article>
  `).join('');
}

function renderSectorShell() {
  sectorGrid.innerHTML = '';
  sectors.forEach((sector) => {
    const section = document.createElement('section');
    section.className = 'panel rounded-lg p-4';
    section.innerHTML = `
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="accent-${sector.accent} flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
            <i data-lucide="${sector.icon}" class="h-5 w-5"></i>
          </div>
          <div>
            <h3 class="text-primary text-lg font-black">${sector.title}</h3>
            <p class="text-muted text-sm">${sector.summary}</p>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3"></div>
    `;
    const cards = section.querySelector('.grid');
    sector.stocks.forEach((stock) => {
      const node = template.content.cloneNode(true);
      const card = node.querySelector('article');
      card.dataset.symbol = stock.symbol;
      node.querySelector('.stock-symbol').textContent = stock.symbol;
      node.querySelector('.stock-name').textContent = stock.name;
      node.querySelector('.stock-role').textContent = stock.role;
      node.querySelector('.stock-yahoo').href = `https://finance.yahoo.com/quote/${stock.symbol}`;
      node.querySelector('.stock-news').innerHTML = '<p class="text-muted">正在載入新聞...</p>';
      cards.appendChild(node);
    });
    sectorGrid.appendChild(section);
  });
}

function applyQuote(symbol, quote, selectorPrefix = '.stock') {
  const root = document.querySelector(`[data-symbol="${symbol}"]`);
  if (!root) return;
  root.querySelector(`${selectorPrefix}-price`).textContent = `$${formatNumber(quote.price)}`;
  root.querySelector(`${selectorPrefix}-time`).textContent = quote.time.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const changeEl = root.querySelector(`${selectorPrefix}-change`);
  changeEl.className = `${selectorPrefix.slice(1)}-change font-mono text-sm font-black ${changeClass(quote.change)}`;
  changeEl.textContent = `${formatSigned(quote.change)} (${formatSigned(quote.changePercent, '%')})`;
}

function applyIndexQuote(symbol, quote) {
  const root = document.querySelector(`[data-index="${symbol}"]`);
  if (!root) return;
  root.querySelector('.index-price').textContent = formatNumber(quote.price);
  const changeEl = root.querySelector('.index-change');
  changeEl.className = `index-change font-mono text-sm font-black ${changeClass(quote.change)}`;
  changeEl.textContent = `${formatSigned(quote.change)} (${formatSigned(quote.changePercent, '%')})`;
}

function applyNews(symbol, items) {
  const root = document.querySelector(`[data-symbol="${symbol}"] .stock-news`);
  if (!root) return;
  if (!items.length) {
    root.innerHTML = `<a class="link-accent font-bold" target="_blank" rel="noreferrer" href="https://finance.yahoo.com/quote/${symbol}/news">查看 Yahoo Finance 新聞</a>`;
    return;
  }
  root.innerHTML = items.map((item) => `
    <a href="${item.link}" target="_blank" rel="noreferrer" class="news-link block rounded-md border border-transparent p-2 transition">
      <p class="text-primary font-bold leading-snug">${item.title}</p>
      <p class="text-muted mt-1 text-xs">${item.source}${item.date ? ` · ${item.date.toLocaleDateString('zh-TW')}` : ''}</p>
    </a>
  `).join('');
}

async function updateQuotes() {
  setStatus('股價更新中...', 'warn');
  const stockItems = sectors.flatMap((sector) => sector.stocks);
  const allItems = [...indices, ...stockItems];
  const quoteJobs = [];

  try {
    const cnbcQuotes = await fetchCnbcQuotes(allItems);
    indices.forEach((item) => {
      const quote = cnbcQuotes.get(item.symbol);
      if (quote) applyIndexQuote(item.symbol, quote);
      else quoteJobs.push(getQuote(item).then((fallbackQuote) => applyIndexQuote(item.symbol, fallbackQuote)));
    });
    stockItems.forEach((stock) => {
      const quote = cnbcQuotes.get(stock.symbol);
      if (quote) {
        quoteState.set(stock.symbol, quote);
        applyQuote(stock.symbol, quote);
      } else {
        quoteJobs.push(getQuote(stock).then((fallbackQuote) => {
          quoteState.set(stock.symbol, fallbackQuote);
          applyQuote(stock.symbol, fallbackQuote);
        }));
      }
    });
  } catch (batchError) {
    quoteJobs.push(
      ...indices.map((item) => getQuote(item).then((quote) => applyIndexQuote(item.symbol, quote))),
      ...stockItems.map((stock) => getQuote(stock).then((quote) => {
        quoteState.set(stock.symbol, quote);
        applyQuote(stock.symbol, quote);
      }))
    );
  }

  const results = await Promise.allSettled(quoteJobs);
  const failed = results.filter((item) => item.status === 'rejected').length;
  updatedAt.textContent = `更新時間 ${new Date().toLocaleString('zh-TW')}`;
  setStatus(failed ? `部分報價失敗 ${failed} 筆` : '即時資料已更新', failed ? 'warn' : 'live');
}
 
async function updateNews() {
  const stockItems = sectors.flatMap((sector) => sector.stocks);
  const jobs = stockItems.map((stock) => fetchNews(stock.symbol).then((items) => {
    newsState.set(stock.symbol, items);
    applyNews(stock.symbol, items);
  }).catch(() => {
    applyNews(stock.symbol, []);
  }));
  await Promise.allSettled(jobs);
}

async function refreshAll() {
  await Promise.allSettled([updateQuotes(), updateNews()]);
  lucide.createIcons();
}

renderMarketShell();
renderSectorShell();
lucide.createIcons();
refreshAll();

document.getElementById('refresh-btn').addEventListener('click', refreshAll);
setInterval(updateQuotes, 60 * 1000);
setInterval(updateNews, 10 * 60 * 1000);



