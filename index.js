let currentMode = 'compact'; // 'compact' or 'expanded'
let searchData = null;
let acvData = {};

function toggleView() {
    const body = document.body;
    const toggleBtn = document.getElementById('view-toggle');
    
    if (currentMode === 'compact') {
        currentMode = 'expanded';
        body.classList.add('is-expanded');
        toggleBtn.textContent = 'Expanded View';
        toggleBtn.classList.remove('active');
    } else {
        currentMode = 'compact';
        body.classList.remove('is-expanded');
        toggleBtn.textContent = 'Compact View';
        toggleBtn.classList.add('active');
    }
}

function recalcACV() {
    const age = parseFloat(document.getElementById('acv-age-input').value);
    if (isNaN(age) || age < 0 || !acvData.msrp) return;
    const msrp = acvData.msrp;
    const rate = acvData.rate / 100;
    const condition = acvData.condition;
    const newACV = msrp * Math.pow(1 - rate, age) * condition;
    document.getElementById('r-acv').innerText = '$' + newACV.toFixed(2);
    document.getElementById('r-acv-formula').innerText =
        '$' + msrp.toFixed(2) + ' \u00D7 (1 - ' + (rate).toFixed(2) + ')^' + age + ' \u00D7 ' + condition + ' = $' + newACV.toFixed(2);
    document.getElementById('qv-acv').innerText = '$' + newACV.toFixed(2);
}

async function performSearch() {
    const query = document.getElementById('query').value;
    if (!query) return;

    document.getElementById('loader-dog').classList.add('running');
    document.getElementById('loader-text').classList.add('visible');
    document.getElementById('results').classList.add('hidden');
    
    try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        searchData = data;
        
        const a = data.analysis;
        const rd = data.releaseDate || {};
        const v = data.valuation || {};

        // Section 1: Analysis
        document.getElementById('r-overview').innerText = a.overview || '';
        document.getElementById('r-item-desc').innerText = a.itemDescription || a.descriptionMain || '';
        document.getElementById('r-key-details').innerText = a.keyDetails || a.detailsMain || '';
        
        // Spec Filtering
        const allSpecs = parseSpecs(a.technicalSpecs);
        const majorSpecKeys = ['Type', 'Category', 'Capacity', 'Size', 'Power', 'BTU', 'Watt', 'HP', 'Material', 'Tier', 'Warranty'];
        const majorSpecs = allSpecs.filter(s => majorSpecKeys.some(k => s.label.toLowerCase().includes(k.toLowerCase())));
        const otherSpecs = allSpecs.filter(s => !majorSpecKeys.some(k => s.label.toLowerCase().includes(k.toLowerCase())));

        // Update the basic list
        document.getElementById('r-tech-specs').innerText = majorSpecs.map(s => `${s.label}: ${s.value}`).join(', ') || 'N/A';
        document.getElementById('r-materials').innerText = a.materials || 'Not specified';

        // Update the extended list
        const extendedList = document.getElementById('extended-specs-list');
        extendedList.innerHTML = otherSpecs.map(s => `<li><span class="label">${s.label}</span> <span>${s.value}</span></li>`).join('');

        // Release Date & Age
        document.getElementById('r-production-era').innerText = rd.productionEra || a.age || 'Unknown';
        document.getElementById('r-discontinuation').innerText = rd.discontinuation || a.status || '';
        document.getElementById('r-estimated-age').innerText = rd.estimatedAge || a.age || 'Unknown';
        document.getElementById('r-service-life').innerText = rd.serviceLife || '';

        // Advisory Banner
        const advisory = document.getElementById('age-advisory');
        if (a.modelConfidence === 'estimated') {
            advisory.classList.remove('hidden');
        } else {
            advisory.classList.add('hidden');
        }

        // Valuation
        document.getElementById('r-msrp').innerText = a.msrp || '';
        document.getElementById('r-depreciation-display').innerText = v.annualDepreciationDisplay || (v.annualDepreciationPercent + '%') || '';
        document.getElementById('r-acv').innerText = v.estimatedACV || '';
        document.getElementById('r-acv-formula').innerText = v.acvFormula || '';
        document.getElementById('r-acv-note').innerText = v.acvNote || '';

        // Store for recalculation
        const ageNum = rd.ageNumeric || 0;
        acvData = {
            msrp: a.msrpNumeric || parseFloat(String(a.msrp).replace(/[^0-9.]/g, '')) || 0,
            rate: v.annualDepreciationPercent || 10,
            condition: v.conditionFactor || 0.75
        };
        document.getElementById('acv-age-input').value = ageNum;

        // Section 2: Replacement Table
        const tbody = document.getElementById('table-body');
        // Filter table rows to major categories if needed, but the original layout had 4 main ones.
        // We'll show the top 7 rows for "major categories" as requested.
        tbody.innerHTML = data.table.slice(0, 7).map(row => `
            <tr>
                <td>${row.label}</td>
                <td>${row.original}</td>
                <td class="brand-match">${row.brandMatch}</td>
                <td>${row.option1}</td>
                <td>${row.option2}</td>
            </tr>
        `).join('');

        // Section 3: Technical
        const manualBox = document.getElementById('manual-box');
        manualBox.innerHTML = data.technical.manual !== 'N/A'
            ? `<a href="${data.technical.manual}" target="_blank" class="manual-link no-print">&#128196; VIEW SERVICE MANUAL (PDF)</a>`
            : `<span style="color: var(--text-muted-dark); font-style: italic; font-size: 0.75rem;">Service manual not available.</span>`;
        document.getElementById('r-recalls').innerText = data.technical.recalls;
        document.getElementById('r-failures').innerText = data.technical.failures;
        document.getElementById('r-legal').innerText = data.technical.legal;

        // Error Codes
        const ecContainer = document.getElementById('error-codes-container');
        const ec = data.technical.errorCodes;
        const ecSource = data.technical.errorCodesSource;
        if (ec && ec.length > 0) {
            let html = '<div class="error-codes-section"><div class="error-codes-title">Known Error / Fault Codes</div>';
            html += '<table class="error-codes-table"><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody>';
            html += ec.map(e => `<tr><td>${e.code}</td><td>${e.description}</td></tr>`).join('');
            html += '</tbody></table>';
            if (ecSource && ecSource.url) {
                html += `<a href="${ecSource.url}" target="_blank" class="error-codes-link">&#128279; ${ecSource.title || 'View full error code reference'}</a>`;
            }
            html += '</div>';
            ecContainer.innerHTML = html;
        } else {
            ecContainer.innerHTML = '';
        }

        // Section 4: How It Works
        document.getElementById('r-how-it-works').innerText = data.howItWorks || 'No explanation available.';

        // Section 5: Diagnostics
        const diagContainer = document.getElementById('r-diagnostics');
        if (data.diagnostics && data.diagnostics.length > 0) {
            diagContainer.innerHTML = '<ul class="diagnostics-list">' +
                data.diagnostics.map(d => `<li><a href="${d.url}" target="_blank">${d.title}</a> <span class="diag-source">- ${d.source}</span></li>`).join('') +
                '</ul>';
        } else {
            diagContainer.innerHTML = '<p class="diagnostics-empty">No diagnostic resources found.</p>';
        }

        // Quick View (Hidden by default in new flow but logic remains)
        document.getElementById('qv-category').innerText = a.quickSummary || 'N/A';
        document.getElementById('qv-status').innerText = a.status || '';
        document.getElementById('qv-age').innerText = rd.estimatedAge || a.age || '';
        document.getElementById('qv-msrp').innerText = a.msrp || '';
        document.getElementById('qv-acv').innerText = v.estimatedACV || 'N/A';

        // Estimation Banner
        const banner = document.getElementById('estimation-banner');
        if (a.modelConfidence === 'estimated') {
            document.getElementById('estimation-text').innerText =
                'Full model number not provided. Information below is based on an estimated model of ' + (a.estimatedModel || 'unknown') + '.';
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }

        // Set Default View
        currentMode = 'compact';
        document.body.classList.remove('is-expanded');
        document.getElementById('view-toggle').textContent = 'Compact View';
        document.getElementById('view-toggle').classList.add('active');
        
        // Hide full specs container by default
        document.getElementById('full-specs-container').style.display = 'none';
        document.getElementById('toggle-specs').textContent = 'Show full technical specifications';

        document.getElementById('results').classList.remove('hidden');
    } catch (e) { 
        console.error(e);
        alert("Error retrieving data."); 
    } finally {
        document.getElementById('loader-dog').classList.remove('running');
        document.getElementById('loader-text').classList.remove('visible');
    }
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

function toggleFullSpecs() {
    const container = document.getElementById('full-specs-container');
    const btn = document.getElementById('toggle-specs');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.innerText = 'Hide full technical specifications';
    } else {
        container.style.display = 'none';
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
Value: Est. Replacement Cost: ${topPrices} | Est. ACV: ${v.estimatedACV || 'N/A'}
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

document.addEventListener('DOMContentLoaded', function() {
    const queryInput = document.getElementById('query');
    const searchBtn = document.getElementById('btn');
    const toggleBtn = document.getElementById('view-toggle');
    const printBtn = document.getElementById('print-btn');
    const recalcBtn = document.getElementById('recalc-btn');
    const copyBtn = document.getElementById('copy-btn');
    const specsBtn = document.getElementById('toggle-specs');

    if (queryInput) {
        queryInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (toggleBtn) toggleBtn.addEventListener('click', toggleView);
    if (printBtn) printBtn.addEventListener('click', function() { window.print(); });
    if (recalcBtn) recalcBtn.addEventListener('click', recalcACV);
    if (copyBtn) copyBtn.addEventListener('click', copySummary);
    if (specsBtn) specsBtn.addEventListener('click', toggleFullSpecs);
});
