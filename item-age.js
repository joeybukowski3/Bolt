(() => {
  const YEAR_MAP_W = { 'L': 2001, 'M': 2002, 'P': 2003, 'R': 2004, 'S': 2005, 'T': 2006, 'U': 2007, 'W': 2008, 'X': 2009, 'Y': 2010, 'A': 2011, 'B': 2012, 'C': 2013, 'D': 2014, 'E': 2015, 'F': 2016, 'G': 2017, 'H': 2018, 'J': 2019, 'K': 2020, 'L': 2021, 'M': 2022, 'P': 2023, 'R': 2024, 'S': 2025 };
  const YEAR_MAP_S = { 'B': 2011, 'C': 2012, 'D': 2013, 'F': 2014, 'G': 2015, 'H': 2016, 'J': 2017, 'K': 2018, 'M': 2019, 'N': 2020, 'R': 2021, 'T': 2022, 'W': 2023, 'X': 2024, 'Y': 2025 };
  const YEAR_MAP_GE = { 'L': 2010, 'M': 2011, 'R': 2012, 'S': 2013, 'T': 2014, 'V': 2015, 'Z': 2016, 'A': 2017, 'D': 2018, 'F': 2019, 'G': 2020, 'H': 2021, 'L': 2022, 'M': 2023, 'R': 2024, 'S': 2025 };
  const MONTH_MAP_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTH_MAP_GE = { 'A': 'January', 'B': 'February', 'D': 'March', 'F': 'April', 'G': 'May', 'H': 'June', 'L': 'July', 'M': 'August', 'R': 'September', 'S': 'October', 'T': 'November', 'V': 'December' };

  const DECODING_DATA = {
    'Appliances': {
      'Samsung': {
        example: 'R1234567890',
        decode: (serial) => {
          if (serial.length < 10) return null;
          // Robust targeting for 15-char vs variable lengths
          const yearChar = serial.length >= 15 ? serial.charAt(7).toUpperCase() : serial.charAt(serial.length - 3).toUpperCase();
          const monthChar = serial.length >= 15 ? serial.charAt(8).toUpperCase() : serial.charAt(serial.length - 2).toUpperCase();
          const year = YEAR_MAP_S[yearChar];
          const monthCodes = { '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun', '7': 'Jul', '8': 'Aug', '9': 'Sep', 'A': 'Oct', 'B': 'Nov', 'C': 'Dec' };
          const month = monthCodes[monthChar];
          if (!year || !month) return null;
          return { month, year, details: `Samsung: Character at position ${serial.length >= 15 ? 8 : '8 from end'} is year, next is month.` };
        }
      },
      'Whirlpool': { example: 'CYW1234567', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Maytag': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'KitchenAid': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Amana': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Jenn-Air': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Admiral': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Roper': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Estate': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Inglis': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'Crosley': { example: '12345678AB', decode: (s) => decodeWhirlpoolStyle(s, 2) },
      'GE': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'GE Cafe': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'GE Monogram': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'GE Profile': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'Hotpoint': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'RCA': { example: 'AA123456B', decode: (s) => decodeGE(s) },
      'LG': { 
        example: '304KMXY12345', 
        decode: (s) => {
          const yearDigit = parseInt(s.charAt(0));
          if (isNaN(yearDigit)) return null;
          const monthStr = s.substring(1, 3);
          const month = MONTH_MAP_FULL[parseInt(monthStr) - 1];
          const year = 2000 + yearDigit + (yearDigit < 5 ? 20 : 10); // Heuristic for 2010s/2020s
          return { month, year, details: `LG: 1st digit (${yearDigit}) is year, 2nd/3rd (${monthStr}) is month.` };
        }
      },
      'Frigidaire': { example: 'BA12345678', decode: (s) => decodeFrigidaire(s) },
      'Electrolux': { example: 'BA12345678', decode: (s) => decodeFrigidaire(s) },
      'Kenmore': { example: '123456789', decode: (s) => null }, // Kenmore prefix-based, fallback to AI
      'Bosch': { example: 'FD 9102 12345', decode: (s) => decodeBosch(s) },
      'Thermador': { example: 'FD 9102 12345', decode: (s) => decodeBosch(s) },
      'Gaggenau': { example: 'FD 9102 12345', decode: (s) => decodeBosch(s) }
    },
    'Water Heaters': {
      'Rheem': { example: '0512A12345', decode: (s) => decodeStyle1(s) },
      'Ruud': { example: '0512A12345', decode: (s) => decodeStyle1(s) },
      'Richmond': { example: '0512A12345', decode: (s) => decodeStyle1(s) },
      'Vanguard': { example: '0512A12345', decode: (s) => decodeStyle1(s) },
      'Bradford White': { 
        example: 'ZH1234567', 
        decode: (s) => {
          const yearChar = s.charAt(0).toUpperCase();
          const monthChar = s.charAt(1).toUpperCase();
          const yearMap = { 'A': 2004, 'B': 2005, 'C': 2006, 'D': 2007, 'E': 2008, 'F': 2009, 'G': 2010, 'H': 2011, 'J': 2012, 'K': 2013, 'L': 2014, 'M': 2015, 'N': 2016, 'P': 2017, 'S': 2018, 'T': 2019, 'W': 2020, 'X': 2021, 'Y': 2022, 'Z': 2023 };
          const monthMap = { 'A': 'Jan', 'B': 'Feb', 'C': 'Mar', 'D': 'Apr', 'E': 'May', 'F': 'Jun', 'G': 'Jul', 'H': 'Aug', 'J': 'Sep', 'K': 'Oct', 'L': 'Nov', 'M': 'Dec' };
          if (yearMap[yearChar] && monthMap[monthChar]) return { month: monthMap[monthChar], year: yearMap[yearChar], details: `Bradford White: 1st char (${yearChar}) = Year, 2nd char (${monthChar}) = Month.` };
          return null;
        }
      },
      'A.O. Smith': { example: '0824123456', decode: (s) => decodeStyle1(s) },
      'State Industries': { example: '0824123456', decode: (s) => decodeStyle1(s) },
      'Reliance': { example: '0824123456', decode: (s) => decodeStyle1(s) },
      'American': { example: '0824123456', decode: (s) => decodeStyle1(s) }
    },
    'HVAC': {
      'Carrier': { example: '1215G12345', decode: (s) => decodeHVAC_WWYY(s, 2) },
      'Bryant': { example: '1215G12345', decode: (s) => decodeHVAC_WWYY(s, 2) },
      'Payne': { example: '1215G12345', decode: (s) => decodeHVAC_WWYY(s, 2) },
      'Lennox': { example: '5812G12345', decode: (s) => decodeHVAC_WWYY(s, 2) },
      'Trane': { example: '123456789', decode: (s) => decodeHVAC_Digits(s, 2, 2) },
      'American Standard': { example: '123456789', decode: (s) => decodeHVAC_Digits(s, 2, 2) },
      'Amana': { example: '1506123456', decode: (s) => decodeHVAC_YYMM(s) },
      'Goodman': { example: '1506123456', decode: (s) => decodeHVAC_YYMM(s) },
      'York': { example: '1215G12345', decode: (s) => decodeHVAC_WWYY(s, 2) }
    },
    'Electronics': {
      'Apple': { 
        example: 'PPPYWSSSCCCC', 
        decode: (s) => {
          if (s.length !== 12) return null;
          const yearChar = s.charAt(3).toUpperCase();
          const weekChar = s.charAt(4).toUpperCase();
          return { details: `Apple 12-char: 4th char (${yearChar}) is Year, 5th char (${weekChar}) is Week.` };
        }
      },
      'ASUS': { 
        example: 'G1N0AS123456', 
        decode: (s) => {
          const yearMap = { 'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022 };
          const year = yearMap[s.charAt(0).toUpperCase()];
          const monthCode = s.charAt(1).toUpperCase();
          const month = (parseInt(monthCode) || (monthCode === 'A' ? 10 : monthCode === 'B' ? 11 : 12));
          if (year && month) return { month: MONTH_MAP_FULL[month-1], year, details: `ASUS: 1st char Year, 2nd char Month.` };
          return null;
        }
      },
      'Google Pixel': { example: '9102123456', decode: (s) => ({ year: 2010 + parseInt(s.charAt(0)), details: `Pixel: 1st digit is year last digit.` }) },
      'Sony': { example: 'Check Model Number', decode: (s) => null } // Sony handled by Model logic
    }
  };

  function decodeWhirlpoolStyle(s, yearPos) {
    const yearChar = s.charAt(yearPos).toUpperCase();
    const weekStr = s.substring(yearPos + 1, yearPos + 3);
    const year = YEAR_MAP_W[yearChar];
    const week = parseInt(weekStr);
    if (year && !isNaN(week)) return { week, year, details: `Whirlpool Style: Char ${yearPos+1} (${yearChar}) = Year, Digits ${yearPos+2}-${yearPos+3} (${weekStr}) = Week.` };
    return null;
  }

  function decodeGE(s) {
    const monthChar = s.charAt(0).toUpperCase();
    const yearChar = s.charAt(1).toUpperCase();
    const year = YEAR_MAP_GE[yearChar];
    const month = MONTH_MAP_GE[monthChar];
    if (year && month) return { month, year, details: `GE Style: 1st char (${monthChar}) = Month, 2nd char (${yearChar}) = Year.` };
    return null;
  }

  function decodeFrigidaire(s) {
    const yearDigit = parseInt(s.charAt(2));
    const year = 2010 + yearDigit; // Heuristic
    return { year, details: `Frigidaire: 3rd digit (${yearDigit}) is year last digit.` };
  }

  function decodeBosch(s) {
    const fdMatch = s.match(/FD\s*(\d{4})/i) || s.match(/^(\d{4})/);
    if (!fdMatch) return null;
    const digits = fdMatch[1];
    const year = 1920 + parseInt(digits.substring(0, 2));
    const month = parseInt(digits.substring(2, 4));
    return { month: MONTH_MAP_FULL[month-1], year, details: `Bosch FD: Add 20 to first two digits (${digits.substring(0,2)}) for year.` };
  }

  function decodeStyle1(s) {
    const digits = s.replace(/\D/g, '').substring(0, 4);
    const m = parseInt(digits.substring(0, 2));
    const y = 2000 + parseInt(digits.substring(2, 4));
    if (m > 0 && m <= 12) return { month: MONTH_MAP_FULL[m-1], year: y, details: `Style 1: 1st/2nd digits Month, 3rd/4th digits Year.` };
    return null;
  }

  function decodeHVAC_WWYY(s, yearPos) {
    const week = parseInt(s.substring(0, 2));
    const year = 2000 + parseInt(s.substring(2, 4));
    if (!isNaN(week) && !isNaN(year)) return { week, year, details: `HVAC WWYY: 1st/2nd digits Week, 3rd/4th Year.` };
    return null;
  }

  function decodeHVAC_YYMM(s) {
    const year = 2000 + parseInt(s.substring(0, 2));
    const month = parseInt(s.substring(2, 4));
    if (!isNaN(year) && month <= 12) return { month: MONTH_MAP_FULL[month-1], year, details: `HVAC YYMM: 1st/2nd digits Year, 3rd/4th Month.` };
    return null;
  }

  function decodeHVAC_Digits(s, start, len) {
    const year = 2000 + parseInt(s.substring(start, start + len));
    return { year, details: `Digits ${start+1}-${start+len} indicate year.` };
  }

  let activeCategory = 'Appliances';

  function updateBrandDropdown() {
    const select = document.getElementById('brand-serial');
    if (!select) return;
    const brands = Object.keys(DECODING_DATA[activeCategory] || {}).sort();
    
    let html = `<option value="">-- Select Brand --</option>`;
    brands.forEach(brand => {
      html += `<option value="${brand}">${brand}</option>`;
    });
    html += `<option value="Other">Other (AI Lookup)</option>`;
    select.innerHTML = html;
  }

  function handleTabClick(category) {
    activeCategory = category;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    updateBrandDropdown();
    document.getElementById('age-result').classList.add('hidden');
  }

  function decodeUnicodeEscapes(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\\u([0-9a-fA-F]{4})/g, function(_, code) {
      return String.fromCharCode(parseInt(code, 16));
    });
  }

  async function performAgeLookup(method) {
    const brandSelect = document.getElementById('brand-serial');
    const brand = brandSelect.value;
    const serial = document.getElementById('serial-number').value.trim();
    
    if (!brand || !serial) return;

    if (brand !== 'Other' && DECODING_DATA[activeCategory][brand]) {
      const result = DECODING_DATA[activeCategory][brand].decode(serial);
      if (result) {
        showLocalResult(brand, serial, result);
        return;
      }
    }

    const query = `How old is this ${activeCategory} item? Brand: ${brand === 'Other' ? '' : brand}, Serial Number: ${serial}. Decode the serial number to determine the manufacture date and age.`;
    
    document.getElementById('age-result').classList.add('hidden');
    document.getElementById('age-loading').classList.remove('hidden');

    try {
      const res = await fetch(`/api/search?mode=age&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const a = data.analysis || {};
      const rd = data.releaseDate || {};

      document.getElementById('result-title').innerText = decodeUnicodeEscapes(`${brand !== 'Other' ? brand : ''} Serial Research: ${serial}`);
      let body = '';
      if (rd.estimatedAge) body += `Estimated Age: ${rd.estimatedAge}\n`;
      else if (a.age) body += `Estimated Age: ${a.age}\n`;
      
      if (data.howItWorks) body += `\n${data.howItWorks}`;
      if (a.decodingMethod && a.decodingMethod.available) {
        body += `\n\nSerial Decoding: ${a.decodingMethod.summary}`;
        if (a.decodingMethod.details) body += `\n${a.decodingMethod.details}`;
      }
      
      document.getElementById('result-body').innerText = decodeUnicodeEscapes(body.trim());
      document.getElementById('age-loading').classList.add('hidden');
      document.getElementById('age-result').classList.remove('hidden');
    } catch (e) {
      document.getElementById('age-loading').classList.add('hidden');
      alert('Error looking up item age. Please try again.');
    }
  }

  function showLocalResult(brand, serial, result) {
    document.getElementById('result-title').innerText = `${brand} Serial Research: ${serial}`;
    let body = `Estimated Manufacture Date: ${result.month || ''} ${result.week ? 'Week ' + result.week : ''} ${result.year}\n`;
    if (result.year) {
        const age = new Date().getFullYear() - result.year;
        body += `Calculated Age: ~${age} years\n\n`;
    }
    body += `Decoding Logic:\n${result.details}`;
    
    document.getElementById('result-body').innerText = body.trim();
    document.getElementById('age-loading').classList.add('hidden');
    document.getElementById('age-result').classList.remove('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => handleTabClick(btn.dataset.category));
    });

    updateBrandDropdown();

    const serialForm = document.getElementById('serial-form');
    if (serialForm) {
      serialForm.addEventListener('submit', (event) => {
        event.preventDefault();
        performAgeLookup('serial');
      });
    }

    const altToggle = document.getElementById('alt-toggle');
    if (altToggle) altToggle.addEventListener('click', () => {
      const section = document.getElementById('alt-section');
      section.classList.toggle('open');
      altToggle.classList.toggle('open');
    });

    const modelForm = document.getElementById('model-form');
    if (modelForm) {
      modelForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const brand = document.getElementById('brand-model').value.trim();
        const model = document.getElementById('model-number').value.trim();
        if (!brand || !model) return;

        // Sony Special Case
        if (brand.toLowerCase() === 'sony') {
            const lastChar = model.slice(-1).toUpperCase();
            const sonyMap = { 'H': 2020, 'J': 2021, 'K': 2022, 'L': 2023, 'M': 2024, 'N': 2025 };
            if (sonyMap[lastChar]) {
                const year = sonyMap[lastChar];
                const age = new Date().getFullYear() - year;
                document.getElementById('result-title').innerText = `Sony Model Research: ${model}`;
                document.getElementById('result-body').innerText = `Estimated Manufacture Year: ${year}\nCalculated Age: ~${age} years\n\nDecoding Logic: Sony model suffix '${lastChar}' indicates the production year.`;
                document.getElementById('age-result').classList.remove('hidden');
                return;
            }
        }

        const query = `How old is this ${activeCategory} item? Brand: ${brand}, Model: ${model}. Determine the manufacture date range and age based on the model number.`;
        
        document.getElementById('age-result').classList.add('hidden');
        document.getElementById('age-loading').classList.remove('hidden');

        try {
          const res = await fetch(`/api/search?mode=age&query=${encodeURIComponent(query)}`);
          const data = await res.json();
          document.getElementById('result-title').innerText = `${brand} Model Research: ${model}`;
          const overview = data.releaseDate?.estimatedAge || data.analysis?.overview || 'No specific age found.';
          document.getElementById('result-body').innerText = overview;

          // Technical Reference Cross-Link
          const refBtnWrap = document.getElementById('age-field-ref-wrap');
          if (refBtnWrap) {
            let refUrl = null;
            const b = brand.toLowerCase();
            const cat = activeCategory.toLowerCase();

            if (b.includes("federal pacific") || b.includes("zinsco") || b.includes("pushmatic") || b.includes("breaker") || b.includes("panel")) {
                refUrl = "field-reference.html?item=service-panel";
            } else if (cat.includes("wiring")) {
                refUrl = "field-reference.html?item=home-wiring";
            } else if (cat.includes("refrigerator")) {
                refUrl = "field-reference.html?item=refrigerator";
            } else if (cat.includes("dishwasher")) {
                refUrl = "field-reference.html?item=dishwasher";
            } else if (cat.includes("range") || cat.includes("oven")) {
                refUrl = b.includes("gas") ? "field-reference.html?item=gas-range" : "field-reference.html?item=electric-range";
            } else if (cat.includes("water heater")) {
                refUrl = "field-reference.html?item=water-heater";
            }

            if (refUrl) {
                refBtnWrap.innerHTML = `<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid #e2e8f0;">
                    <p style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase; margin-bottom:0.5rem; letter-spacing:0.05em;">Technical Guidance</p>
                    <a href="${refUrl}" style="display:inline-flex; align-items:center; gap:0.5rem; background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:0.5rem 1rem; border-radius:8px; font-size:0.85rem; font-weight:700; text-decoration:none; transition:all 0.2s;">
                        <span>&#128295;</span> View ${brand} Technical Reference
                    </a>
                </div>`;
                refBtnWrap.classList.remove('hidden');
            } else {
                refBtnWrap.classList.add('hidden');
            }
          }

          document.getElementById('age-loading').classList.add('hidden');
          document.getElementById('age-result').classList.remove('hidden');
        } catch (e) {
          document.getElementById('age-loading').classList.add('hidden');
          alert('Error lookup.');
        }
      });
    }
  });
})();
