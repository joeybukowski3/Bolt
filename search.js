(() => {
  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const allowedRetailers = [
    'best buy', 'home depot', 'lowe', 'lowes', 'walmart', 'amazon', 'target', 'aj madison'
  ];
  const disallowedRetailers = ['ebay', 'etsy', 'mercari', 'facebook', 'craigslist'];

  let lastQuery = '';
  let compactData = null;
  let expandedData = null;

  function $(id) {
    return document.getElementById(id);
  }

  function normalizeQuery(query) {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function getCacheKey(query) {
    return `bolt_cache_${normalizeQuery(query)}`;
  }

  function readCache(query) {
    const raw = localStorage.getItem(getCacheKey(query));
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      if (!payload || !payload.timestamp || !payload.data) return null;
      if (Date.now() - payload.timestamp > CACHE_TTL_MS) return null;
      return payload;
    } catch {
      return null;
    }
  }

  function writeCache(query, data, mode) {
    localStorage.setItem(getCacheKey(query), JSON.stringify({
      timestamp: Date.now(),
      data,
      mode
    }));
  }

  function updateCacheStatus(text) {
    $('cache-status').innerText = text;
  }

  function showCacheBanner(isCached, timestamp) {
    const banner = $('cache-banner');
    if (!isCached) {
      banner.classList.add('hidden');
      return;
    }
    const date = new Date(timestamp);
    $('cache-banner-text').innerText = `Cached result (Last updated ${date.toLocaleString()}).`;
    banner.classList.remove('hidden');
  }

  function clearCache() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('bolt_cache_')) localStorage.removeItem(key);
    });
    updateCacheStatus('Cache cleared.');
  }

  function refreshSearch() {
    performSearch({ forceRefresh: true });
  }

  function buildOutboundLink(url, meta) {
    return url;
  }

  function isAllowedRetailer(listing) {
    const retailerRaw = (listing.retailer || listing.store || listing.source || '').toLowerCase();
    if (!retailerRaw) return false;
    if (disallowedRetailers.some(bad => retailerRaw.includes(bad))) return false;
    if (!allowedRetailers.some(ok => retailerRaw.includes(ok))) return false;

    const seller = (listing.seller || listing.merchant || '').toLowerCase();
    const marketplace = listing.marketplace === true || listing.isMarketplace === true;
    if (retailerRaw.includes('amazon') && seller && !seller.includes('amazon')) return false;
    if (retailerRaw.includes('walmart') && seller && !seller.includes('walmart')) return false;
    if (marketplace) return false;
    return true;
  }

  function filterListings(listings) {
    if (!Array.isArray(listings)) return [];
    return listings.filter(isAllowedRetailer);
  }

  function isGeneralQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return false;
    const hasDigits = /\d/.test(trimmed);
    const hasSerialWord = /serial|model|sku|part/i.test(trimmed);
    return !hasDigits && !hasSerialWord;
  }

  function showGeneralQueryNote(query) {
    const note = $('general-query-note');
    if (!isGeneralQuery(query)) {
      note.classList.add('hidden');
      return;
    }
    note.innerText = 'Model selected for estimation based on typical mid-range specification for this category. Results are estimated based on the input search query. For more precise results, include brand, model number, or serial number.';
    note.classList.remove('hidden');
  }

  function renderCompactView(data) {
    const a = data.analysis || {};
    const rd = data.releaseDate || {};
    const v = data.valuation || {};
    const replacements = data.replacements || {};

    const exactMatch = replacements.exactMatches ? filterListings(replacements.exactMatches)[0] : null;
    const firstEquivalent = replacements.equivalents && replacements.equivalents[0] ? replacements.equivalents[0] : null;
    const topReplacement = exactMatch
      ? `Exact model currently available at ${exactMatch.retailer || 'retailer'} (${exactMatch.price || 'price unavailable'})`
      : (firstEquivalent ? `${firstEquivalent.name || 'Best equivalent'} - ${firstEquivalent.tier || 'closest spec match'}` : 'No replacement listed');

    const brandModel = (a.brand || a.model)
      ? `${a.brand || 'Unknown'} ${a.model || ''}`.trim()
      : (isGeneralQuery(lastQuery) ? 'Representative mid-range model' : 'Unknown');

    const row = `
      <tr>
        <td>${a.entered || a.itemDescription || lastQuery}</td>
        <td>${brandModel}</td>
        <td>${rd.productionEra || rd.estimatedAge || a.age || 'Unknown'}</td>
        <td>${v.estimatedReplacementCost || a.msrp || 'Not provided'}</td>
        <td>${topReplacement}</td>
      </tr>
    `;
    $('compact-body').innerHTML = row;
  }

  function renderReplacementBlocks(data, table) {
    const replacements = data.replacements || {};
    const exactMatches = filterListings(replacements.exactMatches || []);
    const exactBlock = $('exact-match-block');

    if (exactMatches.length > 0) {
      exactBlock.innerHTML = `
        <div class="replacement-status match">Exact model currently available.</div>
        <div class="listing-grid">
          ${exactMatches.slice(0, 3).map(match => {
            const link = buildOutboundLink(match.url, { retailer: match.retailer, sku: match.sku });
            return `
              <div class="listing-card">
                <div><strong>${match.title || 'Exact match'}</strong></div>
                <div>${match.retailer || 'Retailer'} - ${match.price || 'Price unavailable'}</div>
                <a href="${link}" target="_blank" rel="sponsored noopener noreferrer">View listing</a>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      exactBlock.innerHTML = `
        <div class="replacement-status none">Exact model currently not available.</div>
        <p class="overview-text">Replacements are ordered by successor model, closest line match, and comparable alternative.</p>
      `;
    }

    const equivalentsBlock = $('equivalents-block');
    const equivalents = replacements.equivalents || [];
    if (!equivalents.length) {
      equivalentsBlock.innerHTML = '<p class="overview-text">No equivalents provided.</p>';
      return;
    }

    equivalentsBlock.innerHTML = equivalents.map(eq => {
      const listings = filterListings(eq.listings || []);
      return `
        <div class="replacement-block" style="background:#fff;">
          <div><strong>${eq.name || 'Equivalent'}</strong> - ${eq.tier || ''}</div>
          <div class="overview-text" style="margin-top:0.4rem;">${(eq.reasons || []).slice(0, 3).join(' | ') || 'Comparable specification tier based on available data.'}</div>
          <div class="listing-grid" style="margin-top:0.6rem;">
            ${listings.length ? listings.slice(0, 3).map(listing => {
              const link = buildOutboundLink(listing.url, { retailer: listing.retailer, sku: listing.sku });
              return `
                <div class="listing-card">
                  <div><strong>${listing.retailer || 'Retailer'}</strong></div>
                  <div>${listing.price || 'Price unavailable'}</div>
                  <a href="${link}" target="_blank" rel="sponsored noopener noreferrer">View listing</a>
                </div>
              `;
            }).join('') : '<div class="listing-card">No active direct listings provided.</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderComparisonTable(table) {
    if (!table || !table.length) {
      $('comparison-table').innerHTML = '<p class="overview-text">Comparison data not provided.</p>';
      return;
    }
    const headers = `<tr><th>Category</th><th>Original</th><th>Option 1</th><th>Option 2</th></tr>`;
    const rows = [
      { label: 'Form factor / type', key: ['type', 'form'] },
      { label: 'Capacity / size', key: ['capacity', 'size', 'volume', 'width', 'height', 'depth', 'inch', 'cu'] },
      { label: 'Core performance specs', key: ['power', 'speed', 'rpm', 'btu', 'watt', 'voltage', 'amp'] },
      { label: 'Build / material tier', key: ['material', 'build', 'construction', 'finish'] },
      { label: 'Feature tier', key: ['feature', 'smart', 'mode', 'tech'] },
      { label: 'Warranty class', key: ['warranty', 'coverage'] }
    ].map(item => {
      const row = table.find(r => item.key.some(k => String(r.label || '').toLowerCase().includes(k)));
      return `
        <tr>
          <td>${item.label}</td>
          <td>${row ? row.original : 'Not provided'}</td>
          <td>${row ? row.option1 : 'Not provided'}</td>
          <td>${row ? row.option2 : 'Not provided'}</td>
        </tr>
      `;
    }).join('');
    $('comparison-table').innerHTML = `<table class="spec-table">${headers}${rows}</table>`;
  }

  function buildCopySummary(data, query) {
    const a = data.analysis || {};
    const rd = data.releaseDate || {};
    const v = data.valuation || {};
    const replacements = data.replacements || {};
    const exact = replacements.exactMatches && replacements.exactMatches[0]
      ? `Exact match found: ${replacements.exactMatches[0].title || 'Exact match'}`
      : `Best equivalent: ${(replacements.equivalents && replacements.equivalents[0]) ? replacements.equivalents[0].name : 'Closest available option'} (closest spec match)`;
    const listingSummary = replacements.exactMatches && replacements.exactMatches.length
      ? replacements.exactMatches.slice(0, 3).map(l => `${l.retailer} - ${l.price}`).join(', ')
      : (replacements.equivalents && replacements.equivalents[0] && replacements.equivalents[0].listings)
        ? replacements.equivalents[0].listings.slice(0, 3).map(l => `${l.retailer} - ${l.price}`).join(', ')
        : 'Listings not provided';
    const range = rd.productionEra || a.age || 'Unknown';
    const confidence = rd.confidence || a.modelConfidence || 'Unknown';
    const method = data.howItWorks ? String(data.howItWorks).split('. ')[0] + '.' : 'Signals include model and serial inputs with replacement selection based on match and closest equivalent logic.';
    const brand = a.brand || 'Unknown';
    const model = a.model || 'Unknown';

    return `Claim Note - Bolt Research Team\n` +
      `Item: ${query}\n` +
      `Brand/Model: ${brand} ${model}\n` +
      `Estimated Mfr Date/Age: ${range} (${confidence})\n` +
      `Value: Est. Replacement Cost: ${v.estimatedReplacementCost || a.msrp || 'Not provided'} | Est. ACV: ${v.estimatedACV || 'Not provided'}\n` +
      `LKQ Replacement: ${exact}\n` +
      `Comparable Listings: ${listingSummary}\n` +
      `Method: ${method}\n` +
      `Disclosure: Estimates; verify where required.`;
  }

  function renderExpandedView(data) {
    const a = data.analysis || {};
    const rd = data.releaseDate || {};
    const v = data.valuation || {};
    const table = data.table || [];

    $('r-overview').innerText = a.overview || a.descriptionMain || 'No overview provided.';
    $('r-tech-specs').innerText = a.technicalSpecs || 'Not provided';
    $('r-materials').innerText = a.materials || 'Not provided';
    $('r-key-diff').innerText = a.keyDetails || a.detailsMain || 'Not provided';

    $('r-production-era').innerText = rd.productionEra || a.age || 'Unknown';
    $('r-estimated-age').innerText = rd.estimatedAge || a.age || 'Unknown';
    $('r-confidence').innerText = rd.confidence || a.modelConfidence || 'Unknown';
    let rationale = rd.rationale || (a.decodingMethod && a.decodingMethod.summary) || 'Based on available model and serial inputs with product lifecycle references.';
    if (isGeneralQuery(lastQuery)) {
      rationale += ' Model selected for estimation based on typical mid-range specification for this category.';
    }
    $('r-rationale').innerText = rationale;

    $('r-replacement-cost').innerText = v.estimatedReplacementCost || a.msrp || 'Not provided';
    $('r-acv').innerText = v.estimatedACV || 'Not provided';
    $('r-value-note').innerText = v.acvNote || v.annualDepreciationDisplay || '';

    renderReplacementBlocks(data, table);
    renderComparisonTable(table);
    $('r-method').innerText = data.howItWorks || 'Methodology not provided.';
    $('r-disclosures').innerHTML = [
      'Estimates are provided for documentation support only.',
      'Verify exact model and pricing where required.',
      'Listings and availability can change after report generation.'
    ].map(item => `<li>${item}</li>`).join('');

    $('copy-summary-text').value = buildCopySummary(data, lastQuery);
  }

  function showExpandedView() {
    $('expanded-view').classList.remove('hidden');
    $('compact-view').classList.add('hidden');
    $('expand-btn').innerText = 'Compact View';
    $('expand-btn').onclick = () => {
      $('expanded-view').classList.add('hidden');
      $('compact-view').classList.remove('hidden');
      $('expand-btn').innerText = 'Expanded View';
      $('expand-btn').onclick = loadExpandedView;
    };
  }

  async function loadExpandedView() {
    if (!lastQuery) return;
    if (expandedData) {
      renderExpandedView(expandedData);
      showExpandedView();
      return;
    }
    const cached = readCache(lastQuery);
    if (cached && cached.mode === 'expanded') {
      expandedData = cached.data;
      renderExpandedView(expandedData);
      showExpandedView();
      return;
    }
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(lastQuery)}&mode=expanded`);
      const data = await res.json();
      expandedData = data;
      writeCache(lastQuery, data, 'expanded');
      renderExpandedView(expandedData);
      showExpandedView();
    } catch {
      alert('Error retrieving expanded data.');
    }
  }

  async function performSearch(options = {}) {
    const queryInput = $('query');
    const query = queryInput.value.trim();
    if (!query) return;
    lastQuery = query;
    compactData = null;
    expandedData = null;
    $('expanded-view').classList.add('hidden');
    $('compact-view').classList.remove('hidden');
    $('expand-btn').innerText = 'Expanded View';
    $('expand-btn').onclick = loadExpandedView;

    const cached = !options.forceRefresh ? readCache(query) : null;
    if (cached) {
      compactData = cached.data;
      renderCompactView(compactData);
      showGeneralQueryNote(query);
      showCacheBanner(true, cached.timestamp);
      updateCacheStatus('Serving cached result.');
      $('results').classList.remove('hidden');
      return;
    }

    updateCacheStatus('Searching...');
    $('results').classList.add('hidden');

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&mode=compact`);
      const data = await res.json();
      compactData = data;
      writeCache(query, data, 'compact');
      renderCompactView(compactData);
      showGeneralQueryNote(query);
      showCacheBanner(false);
      updateCacheStatus('Results updated just now.');
      $('results').classList.remove('hidden');
    } catch {
      alert('Error retrieving data.');
      updateCacheStatus('Search failed.');
    }
  }

  async function copySummary() {
    const textarea = $('copy-summary-text');
    if (!textarea.value) return;
    try {
      await navigator.clipboard.writeText(textarea.value);
      $('copy-status').innerText = 'Copied to clipboard.';
    } catch {
      textarea.select();
      document.execCommand('copy');
      $('copy-status').innerText = 'Copied to clipboard.';
    }
  }

  function initFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      $('query').value = q;
      performSearch();
    }
  }

  function initEvents() {
    $('query').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });
    $('btn').addEventListener('click', () => performSearch());
    $('clear-cache').addEventListener('click', clearCache);
    $('expand-btn').addEventListener('click', loadExpandedView);
    $('refresh-btn').addEventListener('click', refreshSearch);
    $('print-btn').addEventListener('click', () => window.print());
    $('copy-btn').addEventListener('click', copySummary);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    initFromQuery();
  });
})();
