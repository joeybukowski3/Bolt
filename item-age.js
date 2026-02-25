(() => {
  function toggleAlt() {
    const section = document.getElementById('alt-section');
    const toggle = document.getElementById('alt-toggle');
    if (!section || !toggle) return;
    section.classList.toggle('open');
    toggle.classList.toggle('open');
  }

  async function performAgeLookup(method) {
    let query;
    if (method === 'serial') {
      const brand = document.getElementById('brand-serial').value.trim();
      const serial = document.getElementById('serial-number').value.trim();
      if (!brand || !serial) return;
      query = `How old is this item? Brand: ${brand}, Serial Number: ${serial}. Decode the serial number to determine the manufacture date and age.`;
    } else {
      const brand = document.getElementById('brand-model').value.trim();
      const model = document.getElementById('model-number').value.trim();
      if (!brand || !model) return;
      query = `How old is this item? Brand: ${brand}, Model: ${model}. Determine the manufacture date range and age based on the model number.`;
    }

    document.getElementById('age-result').classList.add('hidden');
    document.getElementById('age-loading').classList.remove('hidden');

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const a = data.analysis || {};

      document.getElementById('result-title').innerText = a.entered || 'Result';
      let body = '';
      if (a.age) body += `Estimated Age: ${a.age}\n`;
      if (a.descriptionMain) body += `\n${a.descriptionMain}`;
      if (a.descriptionExtra) body += ` ${a.descriptionExtra}`;
      if (a.decodingMethod && a.decodingMethod.available) {
        body += `\n\nSerial Decoding: ${a.decodingMethod.summary}`;
        if (a.decodingMethod.details) body += `\n${a.decodingMethod.details}`;
      }
      document.getElementById('result-body').innerText = body.trim();
      document.getElementById('age-loading').classList.add('hidden');
      document.getElementById('age-result').classList.remove('hidden');
    } catch (e) {
      document.getElementById('age-loading').classList.add('hidden');
      alert('Error looking up item age. Please try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('alt-toggle');
    if (toggle) toggle.addEventListener('click', toggleAlt);

    const serialForm = document.getElementById('serial-form');
    if (serialForm) {
      serialForm.addEventListener('submit', (event) => {
        event.preventDefault();
        performAgeLookup('serial');
      });
    }

    const modelForm = document.getElementById('model-form');
    if (modelForm) {
      modelForm.addEventListener('submit', (event) => {
        event.preventDefault();
        performAgeLookup('model');
      });
    }
  });
})();
