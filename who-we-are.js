(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      alert('Thank you for subscribing! We will be in touch soon.');
      form.reset();
    });
  });
})();
