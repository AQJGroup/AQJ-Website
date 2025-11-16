// frontend/public/include-partials.js
// Loads header/footer partials and dispatches 'partials:loaded' event when done.

async function includePartial(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return Promise.resolve();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Failed to fetch partial:', url, res.status);
      return;
    }
    const html = await res.text();
    el.innerHTML = html;
  } catch (e) {
    console.warn('include error', url, e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // load both partials, then run finalization
  Promise.all([
    includePartial('#header-placeholder', 'partials/header.html'),
    includePartial('#footer-placeholder', 'partials/footer.html')
  ]).then(() => {
    // set current year in footer if element exists
    const yearEl = document.querySelector('#footer-placeholder #year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // signal that partials have been inserted
    window.dispatchEvent(new Event('partials:loaded'));
  }).catch((e) => {
    console.warn('Error loading partials', e);
    window.dispatchEvent(new Event('partials:loaded')); // still dispatch so scripts don't hang
  });
});
