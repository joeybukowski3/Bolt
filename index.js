let currentMode = 'compact'; 
let searchData = null;
let acvData = {};

function toggleView() {
    const body = document.body;
    const toggleBtn = document.getElementById('view-toggle');
    if (!toggleBtn) return;
    
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
    const input = document.getElementById('acv-age-input');
    if (!input) return;
    const age = parseFloat(input.value);
    if (isNaN(age) || age < 0 || !acvData.msrp) return;
    const msrp = acvData.msrp;
    const rate = acvData.rate / 100;
    const condition = acvData.condition;
    const newACV = msrp * Math.pow(1 - rate, age) * condition;
    
    const acvEl = document.getElementById('r-acv');
    const formulaEl = document.getElementById('r-acv-formula');
    const qvAcvEl = document.getElementById('qv-acv');
    
    if (acvEl) acvEl.innerText = '$' + newACV.toFixed(2);
    if (formulaEl) formulaEl.innerText = '$' + msrp.toFixed(2) + ' \u00D7 (1 - ' + (rate).toFixed(2) + ')^' + age + ' \u00D7 ' + condition + ' = $' + newACV.toFixed(2);
    if (qvAcvEl) qvAcvEl.innerText = '$' + newACV.toFixed(2);
}

function inferAgeFromText(estimatedAge, productionEra) {
    const currentYear = new Date().getFullYear();
    const extractYears = (text) => {
        if (!text) return [];
        const matches = String(text).match(/\b(19|20)\d{2}\b/g);
        return matches ? matches.map(m => parseInt(m, 10)) : [];
    };
    const years = [
        ...extractYears(estimatedAge),
        ...extractYears(productionEra)
    ].filter(y => y <= currentYear);
    if (!years.length) return null;
    const latestYear = Math.max(...years);
    const age = Math.max(0, currentYear - latestYear);
    return age;
}

async function performSearch() {
    const queryEl = document.getElementById('query');
    if (!queryEl) return;
    const query = queryEl.value.trim();
    if (!query) return;

    const loaderDog = document.getElementById('loader-dog');
    const loaderText = document.getElementById('loader-text');
    const resultsArea = document.getElementById('results');

    if (loaderDog) loaderDog.classList.add('running');
    if (loaderText) loaderText.classList.add('visible');
    if (resultsArea) resultsArea.classList.add('hidden');
    
    try {
        const res = await fetch(`/api/search?mode=research&query=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        
        const data = await res.json();
        if (!data || data.error) throw new Error(data?.error || "Invalid response format");
        
        searchData = data;
        const a = data.analysis || {};
        const rd = data.releaseDate || {};
        const v = data.valuation || {};
        const tech = data.technical || {};

        // Section 1: Analysis
        const updateText = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val || ''; };
        
        updateText('r-overview', a.overview);
        updateText('r-item-desc', a.itemDescription || a.descriptionMain);
        updateText('r-key-details', a.keyDetails || a.detailsMain);
        
        // Spec Filtering
        const allSpecs = parseSpecs(a.technicalSpecs);
        const majorSpecKeys = ['Type', 'Category', 'Capacity', 'Size', 'Power', 'BTU', 'Watt', 'HP', 'Material', 'Tier', 'Warranty'];
        const majorSpecs = allSpecs.filter(s => majorSpecKeys.some(k => s.label.toLowerCase().includes(k.toLowerCase())));
        const otherSpecs = allSpecs.filter(s => !majorSpecKeys.some(k => s.label.toLowerCase().includes(k.toLowerCase())));

        updateText('r-tech-specs', majorSpecs.map(s => `${s.label}: ${s.value}`).join(', ') || 'N/A');
        updateText('r-materials', a.materials || 'Not specified');

        const extendedList = document.getElementById('extended-specs-list');
        if (extendedList) {
            extendedList.innerHTML = otherSpecs.length > 0 
                ? otherSpecs.map(s => `<li><span class="label">${s.label}</span> <span>${s.value}</span></li>`).join('')
                : '<li>No additional specs found.</li>';
        }

        // Release Date & Age
        updateText('r-production-era', rd.productionEra || 'Unknown');
        updateText('r-discontinuation', rd.discontinuation || a.status);
        const inferredAge = inferAgeFromText(rd.estimatedAge, rd.productionEra);
        const estAgeText = rd.estimatedAge || a.age || '';
        if (!estAgeText || /^0\s*years?\b/i.test(estAgeText)) {
            if (typeof inferredAge === 'number' && inferredAge > 0) {
                updateText('r-estimated-age', `${inferredAge} years`);
            } else {
                updateText('r-estimated-age', 'Unknown');
            }
        } else {
            updateText('r-estimated-age', estAgeText);
        }
        updateText('r-service-life', rd.serviceLife);

        // Advisory Banner
        const advisory = document.getElementById('age-advisory');
        if (advisory) {
            if (a.modelConfidence === 'estimated') advisory.classList.remove('hidden');
            else advisory.classList.add('hidden');
        }

        // Valuation
        updateText('r-msrp', a.msrp);
        updateText('r-depreciation-display', v.annualDepreciationDisplay || (v.annualDepreciationPercent ? v.annualDepreciationPercent + '%' : ''));
        updateText('r-acv', v.estimatedACV);
        updateText('r-acv-formula', v.acvFormula);
        updateText('r-acv-note', v.acvNote);

        // Adjuster Notes
        const notes = data.adjusterNotes || {};
        updateText('r-like-kind', notes.likeKindRationale);
        updateText('r-availability', notes.availabilitySummary);
        updateText('r-warranty', notes.warrantySummary);
        updateText('r-discontinued-impact', notes.discontinuedImpact);
        updateText('r-serial-decoding', notes.serialDecodingSummary);

        // Store for recalculation
        let ageNum = rd.ageNumeric || 0;
        if ((!ageNum || ageNum < 1) && typeof inferredAge === 'number' && inferredAge > 0) {
            ageNum = inferredAge;
        }
        acvData = {
            msrp: a.msrpNumeric || parseFloat(String(a.msrp || '0').replace(/[^0-9.]/g, '')) || 0,
            rate: v.annualDepreciationPercent || 10,
            condition: v.conditionFactor || 0.75
        };
        const ageInput = document.getElementById('acv-age-input');
        if (ageInput) ageInput.value = ageNum;

        // Section 2: Replacement Table
        const tbody = document.getElementById('table-body');
        if (tbody && data.table) {
            tbody.innerHTML = data.table.map(row => `
                <tr>
                    <td>${row.label || ''}</td>
                    <td>${row.original || ''}</td>
                    <td class="brand-match">${row.brandMatch || ''}</td>
                    <td>${row.option1 || ''}</td>
                    <td>${row.option2 || ''}</td>
                </tr>
            `).join('');
        }

        // Section 3: Technical
        const manualBox = document.getElementById('manual-box');
        if (manualBox) {
            manualBox.innerHTML = (tech.manual && tech.manual !== 'N/A')
                ? `<a href="${tech.manual}" target="_blank" class="manual-link no-print">&#128196; VIEW SERVICE MANUAL (PDF)</a>`
                : `<span style="color: var(--text-muted-dark); font-style: italic; font-size: 0.75rem;">Service manual not available.</span>`;
        }
        updateText('r-recalls', tech.recalls);
        updateText('r-failures', tech.failures);
        updateText('r-symptoms', tech.symptoms);
        updateText('r-legal', tech.legal);

        // Error Codes
        const ecContainer = document.getElementById('error-codes-container');
        if (ecContainer) {
            const ec = tech.errorCodes || [];
            const ecSource = tech.errorCodesSource;
            if (ec.length > 0) {
                let html = '<div class="error-codes-section"><div class="error-codes-title">Known Error / Fault Codes</div>';
                html += '<table class="error-codes-table"><thead><tr><th>Code</th><th>Description</th></tr></thead><tbody>';
                html += ec.map(e => `<tr><td>${e.code || ''}</td><td>${e.description || ''}</td></tr>`).join('');
                html += '</tbody></table>';
                if (ecSource && ecSource.url) {
                    html += `<a href="${ecSource.url}" target="_blank" class="error-codes-link">&#128279; ${ecSource.title || 'View full error code reference'}</a>`;
                }
                html += '</div>';
                ecContainer.innerHTML = html;
            } else {
                ecContainer.innerHTML = '';
            }
        }

        // Section 4: How It Works
        updateText('r-how-it-works', data.howItWorks);

        // Section 5: Diagnostics
        const diagContainer = document.getElementById('r-diagnostics');
        if (diagContainer) {
            if (data.diagnostics && data.diagnostics.length > 0) {
                diagContainer.innerHTML = '<ul class="diagnostics-list">' +
                    data.diagnostics.map(d => `<li><a href="${d.url}" target="_blank">${d.title}</a> <span class="diag-source">- ${d.source}</span></li>`).join('') +
                    '</ul>';
            } else {
                diagContainer.innerHTML = '<p class="diagnostics-empty">No diagnostic resources found.</p>';
            }
        }

        // Quick View
        updateText('qv-category', a.quickSummary || 'N/A');
        updateText('qv-status', a.status);
        updateText('qv-age', rd.estimatedAge || a.age);
        updateText('qv-msrp', a.msrp);
        updateText('qv-acv', v.estimatedACV || 'N/A');

        // Estimation Banner
        const estBanner = document.getElementById('estimation-banner');
        const estText = document.getElementById('estimation-text');
        if (estBanner && estText) {
            if (a.modelConfidence === 'estimated') {
                estText.innerText = 'Full model number not provided. Information below is based on an estimated model of ' + (a.estimatedModel || 'unknown') + '.';
                estBanner.classList.remove('hidden');
            } else {
                estBanner.classList.add('hidden');
            }
        }

        // Set Default View
        currentMode = 'compact';
        document.body.classList.remove('is-expanded');
        const viewToggle = document.getElementById('view-toggle');
        if (viewToggle) {
            viewToggle.textContent = 'Compact View';
            viewToggle.classList.add('active');
        }
        
        const fullSpecs = document.getElementById('full-specs-container');
        const toggleSpecsBtn = document.getElementById('toggle-specs');
        if (fullSpecs) fullSpecs.style.display = 'none';
        if (toggleSpecsBtn) toggleSpecsBtn.textContent = 'Show full technical specifications';

        if (resultsArea) resultsArea.classList.remove('hidden');
    } catch (e) { 
        console.error("Search Fail:", e);
        alert("Search stalled: " + e.message); 
    } finally {
        if (loaderDog) loaderDog.classList.remove('running');
        if (loaderText) loaderText.classList.remove('visible');
    }
}

function parseSpecs(specString) {
    if (!specString) return [];
    if (typeof specString !== 'string') return [];
    const pairs = specString.split(/,|\n/).filter(s => s.includes(':'));
    return pairs.map(p => {
        const parts = p.split(':');
        const label = parts[0];
        const val = parts.slice(1).join(':');
        return { label: (label || '').trim(), value: (val || '').trim() };
    });
}

function toggleFullSpecs() {
    const container = document.getElementById('full-specs-container');
    const btn = document.getElementById('toggle-specs');
    if (!container || !btn) return;
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
    const a = searchData.analysis || {};
    const rd = searchData.releaseDate || {};
    const v = searchData.valuation || {};
    
    const findTableVal = (label) => (searchData.table || []).find(r => r.label === label)?.brandMatch || 'N/A';
    
    const topMatch = findTableVal('Model');
    const topPrices = findTableVal('Price (New)');
    const topRetailers = findTableVal('Retailers');

    const summary = `Claim Note â€” Bolt Research Team
Item: ${a.entered || 'Unknown'}
Brand/Model: ${a.estimatedModel || 'Unknown'}
Estimated Mfr Date/Age: ${rd.productionEra || 'Unknown'} (${rd.estimatedAge || 'Unknown'})
Value: Est. Replacement Cost: ${topPrices} | Est. ACV: ${v.estimatedACV || 'N/A'}
LKQ Replacement: ${topMatch}
Comparable Listings: ${topRetailers} - ${topPrices}
Disclosure: Estimates; verify where required.`;

    navigator.clipboard.writeText(summary).then(() => {
        const btn = document.getElementById('copy-btn');
        if (!btn) return;
        const oldText = btn.innerText;
        btn.innerText = 'âœ… Copied!';
        setTimeout(() => btn.innerText = oldText, 2000);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('btn');
    const query = document.getElementById('query');
    const viewToggle = document.getElementById('view-toggle');
    const specsBtn = document.getElementById('toggle-specs');
    const copyBtn = document.getElementById('copy-btn');
    const printBtn = document.getElementById('print-btn');
    const recalcBtn = document.getElementById('recalc-btn');

    if (btn) btn.addEventListener('click', performSearch);
    if (query) query.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    if (viewToggle) viewToggle.addEventListener('click', toggleView);
    if (specsBtn) specsBtn.addEventListener('click', toggleFullSpecs);
    if (copyBtn) copyBtn.addEventListener('click', copySummary);
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    if (recalcBtn) recalcBtn.addEventListener('click', recalcACV);
});
