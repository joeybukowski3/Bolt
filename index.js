let currentView = 'compact';
let searchData = null;

async function performSearch() {
    const query = document.getElementById('query').value.trim();
    if (!query) return;

    // Reset results and show loading (using generic alert for now as loader was removed in HTML refactor)
    document.getElementById('results').classList.add('hidden');
    
    try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        searchData = data;
        renderResults();
    } catch (e) {
        alert("Error retrieving data.");
    }
}

function renderResults() {
    if (!searchData) return;
    const a = searchData.analysis;
    const rd = searchData.releaseDate || {};
    const v = searchData.valuation || {};
    const t = searchData.technical || {};

    // Header
    document.getElementById('r-report-item').innerText = a.estimatedModel || a.entered;

    // Module A: Overview & Specs
    document.getElementById('r-overview').innerText = a.overview;
    
    const specs = parseSpecs(a.technicalSpecs);
    const majorSpecKeys = ['Type', 'Category', 'Capacity', 'Size', 'Power', 'BTU', 'Watt', 'HP', 'Material', 'Tier', 'Warranty'];
    const majorSpecs = specs.filter(s => majorSpecKeys.some(k => s.label.includes(k)));
    const otherSpecs = specs.filter(s => !majorSpecKeys.some(k => s.label.includes(k)));

    document.getElementById('major-specs').innerHTML = majorSpecs.map(s => `
        <div class="spec-item"><span class="spec-label">${s.label}</span><span class="spec-value">${s.value}</span></div>
    `).join('');

    document.getElementById('full-specs').innerHTML = otherSpecs.map(s => `
        <div class="spec-item"><span class="spec-label">${s.label}</span><span class="spec-value">${s.value}</span></div>
    `).join('');

    // Module B: Age
    const confidence = a.modelConfidence || 'estimated';
    const badgeClass = confidence === 'exact' ? 'badge-exact' : 'badge-estimated';
    document.getElementById('r-confidence-badge').innerHTML = `<span class="confidence-badge ${badgeClass}">${confidence}</span>`;
    document.getElementById('r-estimated-age').innerText = rd.estimatedAge;
    document.getElementById('r-production-era').innerText = `Production Era: ${rd.productionEra}`;
    
    // Generate bullets from age string (rough split)
    const bullets = rd.estimatedAge.split('. ').filter(b => b.length > 5);
    document.getElementById('age-bullets').innerHTML = bullets.map(b => `<li>${b}</li>`).join('');

    // Advisory Banner
    const advisory = document.getElementById('age-advisory');
    if (confidence === 'estimated') advisory.classList.remove('hidden');
    else advisory.classList.add('hidden');

    // Module C: Value
    const replacementCost = searchData.table.find(r => r.label === 'Price (New)')?.brandMatch || '--';
    document.getElementById('r-replacement-cost').innerText = replacementCost;
    document.getElementById('r-msrp').innerText = a.msrp || '--';
    document.getElementById('r-acv').innerText = v.estimatedACV || '--';

    // Module D: LKQ
    const isExact = searchData.table.find(r => r.label === 'Model')?.brandMatch === a.estimatedModel;
    document.getElementById('lkq-status-badge').innerHTML = isExact 
        ? '<span class="lkq-badge badge-match">âœ… Exact model available</span>'
        : '<span class="lkq-badge badge-comparable">â„¹ï¸ Closest comparable options</span>';

    const topModel = searchData.table.find(r => r.label === 'Model')?.brandMatch || 'Replacement Model';
    document.getElementById('lkq-top-name').innerText = topModel;
    
    const topPrice = searchData.table.find(r => r.label === 'Price (New)')?.brandMatch || '';
    const topRetailers = searchData.table.find(r => r.label === 'Retailers')?.brandMatch || '';
    document.getElementById('lkq-top-prices').innerHTML = `
        <span class="price-tag">${topPrice}</span>
        <span style="font-size:0.7rem; color:var(--text-light)">at ${topRetailers}</span>
    `;

    // Filter table to top 5-7 major categories
    const tableBody = document.getElementById('lkq-table-body');
    tableBody.innerHTML = searchData.table.slice(0, 7).map(row => `
        <tr>
            <td class="row-label">${row.label}</td>
            <td>${row.original}</td>
            <td>${row.brandMatch}</td>
        </tr>
    `).join('');

    // Expanded Sections
    document.getElementById('r-how-it-works').innerText = searchData.howItWorks;
    if (searchData.diagnostics && searchData.diagnostics.length > 0) {
        document.getElementById('r-diagnostics').innerHTML = '<ul class="age-bullets">' +
            searchData.diagnostics.map(d => `<li><a href="${d.url}" target="_blank" style="color:var(--blue);text-decoration:none;">${d.title}</a> <span style="color:var(--text-light)">- ${d.source}</span></li>`).join('') +
            '</ul>';
    } else {
        document.getElementById('r-diagnostics').innerHTML = '<p style="font-size:0.8rem; font-style:italic; color:var(--text-light);">No diagnostic resources found.</p>';
    }

    // Apply View State
    updateView();
    document.getElementById('results').classList.remove('hidden');
}

function parseSpecs(specString) {
    if (!specString) return [];
    // Handle "Label: Value, Label: Value" or newlines
    const pairs = specString.split(/,|\n/).filter(s => s.includes(':'));
    return pairs.map(p => {
        const [label, ...val] = p.split(':');
        return { label: label.trim(), value: val.join(':').trim() };
    });
}

function updateView() {
    const expandedOnly = document.getElementById('expanded-only');
    const toggleBtn = document.getElementById('view-toggle');
    
    if (currentView === 'compact') {
        expandedOnly.classList.add('hidden');
        toggleBtn.innerText = 'Compact View';
        toggleBtn.classList.add('active');
    } else {
        expandedOnly.classList.remove('hidden');
        toggleBtn.innerText = 'Expanded View';
        toggleBtn.classList.remove('active');
    }
}

function toggleView() {
    currentView = currentView === 'compact' ? 'expanded' : 'compact';
    updateView();
}

function toggleFullSpecs() {
    const container = document.getElementById('full-specs-container');
    const btn = document.getElementById('toggle-specs');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btn.innerText = 'Hide full technical specifications';
    } else {
        container.classList.add('hidden');
        btn.innerText = 'Show full technical specifications';
    }
}

function copySummary() {
    if (!searchData) return;
    const a = searchData.analysis;
    const rd = searchData.releaseDate || {};
    const v = searchData.valuation || {};
    const topMatch = searchData.table.find(r => r.label === 'Model')?.brandMatch || 'N/A';
    const topPrices = searchData.table.find(r => r.label === 'Price (New)')?.brandMatch || 'N/A';
    const topRetailers = searchData.table.find(r => r.label === 'Retailers')?.brandMatch || 'N/A';

    const summary = `Claim Note â€” Bolt Research Team
Item: ${a.entered}
Brand/Model: ${a.estimatedModel || 'Unknown'}
Estimated Mfr Date/Age: ${rd.productionEra} (${rd.estimatedAge})
Value: Est. Replacement Cost: ${document.getElementById('r-replacement-cost').innerText} | Est. ACV: ${v.estimatedACV || 'N/A'}
LKQ Replacement: ${topMatch}
Comparable Listings: ${topRetailers} - ${topPrices}
Disclosure: Estimates; verify where required.`;

    navigator.clipboard.writeText(summary).then(() => {
        const btn = document.getElementById('copy-btn');
        const oldText = btn.innerText;
        btn.innerText = 'âœ… Copied!';
        setTimeout(() => btn.innerText = oldText, 2000);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn').addEventListener('click', performSearch);
    document.getElementById('query').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('view-toggle').addEventListener('click', toggleView);
    document.getElementById('toggle-specs').addEventListener('click', toggleFullSpecs);
    document.getElementById('copy-btn').addEventListener('click', copySummary);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
});
