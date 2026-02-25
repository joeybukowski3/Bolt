let currentView = 'detailed';
        let acvData = {};

        document.getElementById('query').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') performSearch();
        });

        function toggleView() {
            const quickView = document.getElementById('quick-view');
            const detailedView = document.getElementById('detailed-view');
            const toggleBtn = document.getElementById('view-toggle');
            if (currentView === 'detailed') {
                detailedView.classList.add('hidden');
                quickView.classList.remove('hidden');
                toggleBtn.textContent = 'Detailed View';
                toggleBtn.classList.remove('active');
                currentView = 'quick';
            } else {
                quickView.classList.add('hidden');
                detailedView.classList.remove('hidden');
                toggleBtn.textContent = 'Quick View';
                toggleBtn.classList.add('active');
                currentView = 'detailed';
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
                const a = data.analysis;
                const rd = data.releaseDate || {};
                const v = data.valuation || {};

                // Section 1: Analysis
                document.getElementById('r-overview').innerText = a.overview || '';
                document.getElementById('r-item-desc').innerText = a.itemDescription || a.descriptionMain || '';
                document.getElementById('r-key-details').innerText = a.keyDetails || a.detailsMain || '';
                document.getElementById('r-tech-specs').innerText = a.technicalSpecs || '';
                document.getElementById('r-materials').innerText = a.materials || 'Not specified';

                // Release Date & Age
                document.getElementById('r-production-era').innerText = rd.productionEra || a.age || 'Unknown';
                document.getElementById('r-discontinuation').innerText = rd.discontinuation || a.status || '';
                document.getElementById('r-estimated-age').innerText = rd.estimatedAge || a.age || 'Unknown';
                document.getElementById('r-service-life').innerText = rd.serviceLife || '';

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
                tbody.innerHTML = data.table.map(row => `
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

                // Quick View
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

                // Default to detailed view on new search
                currentView = 'detailed';
                document.getElementById('detailed-view').classList.remove('hidden');
                document.getElementById('quick-view').classList.add('hidden');
                document.getElementById('view-toggle').textContent = 'Quick View';
                document.getElementById('view-toggle').classList.add('active');

                document.getElementById('results').classList.remove('hidden');
            } catch (e) { alert("Error retrieving data."); } finally {
                document.getElementById('loader-dog').classList.remove('running');
                document.getElementById('loader-text').classList.remove('visible');
            }
        }

document.addEventListener('DOMContentLoaded', function() {
    const queryInput = document.getElementById('query');
    const searchBtn = document.getElementById('btn');
    const toggleBtn = document.getElementById('view-toggle');
    const printBtn = document.getElementById('print-btn');
    const recalcBtn = document.getElementById('recalc-btn');

    if (queryInput) {
        queryInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (toggleBtn) toggleBtn.addEventListener('click', toggleView);
    if (printBtn) printBtn.addEventListener('click', function() { window.print(); });
    if (recalcBtn) recalcBtn.addEventListener('click', recalcACV);
});
