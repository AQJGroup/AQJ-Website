/* frontend/js/app.js
   Minimal JS to load JSON data into pages + automatic theme detection + contact form handler
   + robust logo-swap that follows html.light-theme / html.dark-theme and system preference.
*/

//
// Helper: load JSON safely
//
async function loadJSON(path){
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch(e){
    console.warn("loadJSON error", path, e);
    return null;
  }
}

//
// Automatic theme detection (no manual toggle).
// Applies html.dark-theme or html.light-theme and follows system changes.
//
(function themeAuto(){
  function applySystemTheme(){
    try {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.remove("light-theme", "dark-theme");
      document.documentElement.classList.add(prefersDark ? "dark-theme" : "light-theme");
    } catch (e) {
      // fail silently
    }
  }

  // Initial apply
  applySystemTheme();

  // Listen for OS changes and update
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) {
      mq.addEventListener("change", applySystemTheme);
    } else if (mq.addListener) {
      mq.addListener(applySystemTheme);
    }
  }
})();

//
// Robust logo-swap: waits for injected header, preloads candidate files and swaps safely.
//
(function logoSwapRobust() {
  const SELECTOR = ".brand img.logo"; // selector for header logo image
  const DEFAULT_DARK = "../assets/images/logo-dark.png";
  const DEFAULT_LIGHT = "../assets/images/logo-light.png";
  const RETRY_INTERVAL = 120; // ms between attempts to find injected header
  const MAX_RETRIES = 50;     // ~6s total retry

  // Utility: preload an image src and call callback on success/fail
  function preload(src){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = () => reject(src);
      img.src = src;
    });
  }

  // Derive candidate srcs from existing src if dark/light files not present exactly
  function deriveCandidates(currentSrc) {
    // get filename part
    try {
      const parts = currentSrc.split('/');
      const fname = parts[parts.length - 1] || '';
      const dir = parts.slice(0, parts.length - 1).join('/') + (parts.length>1 ? '/' : '');
      const base = fname.split('.')[0] || 'logo';
      const ext = (fname.split('.').slice(1).join('.')) || 'png';
      const candidates = {
        dark: dir + (base.includes('dark') ? base : (base.replace(/-light|-dark/,'') + '-dark')) + '.' + ext,
        light: dir + (base.includes('light') ? base : (base.replace(/-light|-dark/,'') + '-light')) + '.' + ext
      };
      return candidates;
    } catch(e) {
      return { dark: DEFAULT_DARK, light: DEFAULT_LIGHT };
    }
  }

  function getPreferredSources(imgEl) {
    // Prefer explicit default files; fall back to derived from current src
    const current = imgEl && imgEl.getAttribute('src') ? imgEl.getAttribute('src') : DEFAULT_DARK;
    // Normalize path: if current uses ../assets/images/logo.jpg etc.
    const derived = deriveCandidates(current);
    return {
      dark: DEFAULT_DARK,
      light: DEFAULT_LIGHT,
      derivedDark: derived.dark,
      derivedLight: derived.light,
      current
    };
  }

  function applyLogoIfAvailable(imgEl, src) {
    // Preload before applying to avoid broken image flashes
    preload(src).then(() => {
      imgEl.src = src;
    }).catch(() => {
      // failed to load; do nothing
    });
  }

  function applyLogo(imgEl) {
    if (!imgEl) return;
    const prefs = getPreferredSources(imgEl);
    const hasLightClass = document.documentElement.classList.contains("light-theme");
    const hasDarkClass = document.documentElement.classList.contains("dark-theme");

    // Determine which to try first
    const wantLight = hasLightClass ? true : (hasDarkClass ? false : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches));

    // Try sequence: explicit DEFAULT_xxx, then derived candidate, then fallback to current
    const tryOrder = wantLight
      ? [prefs.light, prefs.derivedLight, prefs.dark, prefs.derivedDark, prefs.current]
      : [prefs.dark, prefs.derivedDark, prefs.light, prefs.derivedLight, prefs.current];

    // Attempt to preload and apply the first one that succeeds
    (async function trySequence(list){
      for (const s of list) {
        if (!s) continue;
        try {
          await preload(s);
          imgEl.src = s;
          return;
        } catch(_) {
          // continue to next
        }
      }
      // if none loaded, keep existing src
    })(tryOrder);
  }

  function findLogoWithRetry(attempt = 0) {
    const img = document.querySelector(SELECTOR);
    if (img) {
      applyLogo(img);
      observeThemeChanges(img);
      return;
    }
    if (attempt >= MAX_RETRIES) return;
    setTimeout(() => findLogoWithRetry(attempt + 1), RETRY_INTERVAL);
  }

  function observeThemeChanges(imgEl) {
    // Observe class changes on <html>
    const htmlObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && (m.attributeName === "class" || m.attributeName === "data-theme")) {
          applyLogo(imgEl);
          break;
        }
      }
    });
    htmlObserver.observe(document.documentElement, { attributes: true });

    // Also listen for system-level changes (if no explicit class forcing theme)
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        if (!document.documentElement.classList.contains("light-theme") &&
            !document.documentElement.classList.contains("dark-theme")) {
          applyLogo(imgEl);
        }
      };
      if (mq.addEventListener) mq.addEventListener("change", handler);
      else if (mq.addListener) mq.addListener(handler);
    }
  }

  // Kick off after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => findLogoWithRetry());
  } else {
    findLogoWithRetry();
  }
})();

//
// Contact form handler (sends JSON to /api/contact)
// Safe: will not throw if form absent
//
function setupContactForm(){
  try {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", async function(e){
      e.preventDefault();
      const formMessage = document.getElementById("formMessage");
      if (formMessage) formMessage.textContent = "Sending...";

      const data = {
        name: (form.name && form.name.value) ? form.name.value.trim() : "",
        email: (form.email && form.email.value) ? form.email.value.trim() : "",
        message: (form.message && form.message.value) ? form.message.value.trim() : ""
      };

      // basic client-side validation
      if (!data.name || !data.email || !data.message) {
        if (formMessage) formMessage.textContent = "Please fill all fields.";
        return;
      }

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        let json = {};
        try { json = await res.json(); } catch(e){ json = {}; }

        if (res.ok) {
          if (formMessage) formMessage.textContent = (json.message) ? json.message : "Message sent — thank you!";
          form.reset();
        } else {
          if (formMessage) formMessage.textContent = (json.message) ? json.message : "Failed to send message.";
        }
      } catch (err) {
        console.error("Contact submit error:", err);
        if (formMessage) formMessage.textContent = "Network error — try again later.";
      }
    });
  } catch (e) {
    console.warn("setupContactForm error", e);
  }
}

//
// Main init: load page JSON data + wire contact form
//
async function init(){
  // about
  const about = await loadJSON("../data/about.json");
  if (about && document.getElementById("about-text")) {
    document.getElementById("about-text").innerText = about.summary || "";
    const fullEl = document.getElementById("about-full");
    if (fullEl) fullEl.innerHTML = about.full ? "<p>"+about.full+"</p>" : "";
  }

  // software
  const sw = await loadJSON("../data/software.json");
  if (sw && document.getElementById("software-list")) {
    const el = document.getElementById("software-list");
    el.innerHTML = (sw.tools || []).map(t=> `<div class="software-item"><h3>${t.name}</h3><p>${t.desc}</p></div>`).join("");
  }

  // services
  const services = await loadJSON("../data/services.json");
  if (services && document.getElementById("services-full")) {
    const el = document.getElementById("services-full");
    el.innerHTML = (services.list || []).map(s=> `<h3>${s.title}</h3><p>${s.text}</p>`).join("");
  }

  // projects (simple list)
  const projects = await loadJSON("../data/projects.json");
  if (projects && document.getElementById("projects-list")) {
    const el = document.getElementById("projects-list");
    el.innerHTML = (projects || []).map(p=> `<article><h3>${p.title}</h3><p>${p.summary}</p></article>`).join("");
  }

  // team
  const team = await loadJSON("../data/team.json");
  if (team && document.getElementById("team-list")) {
    const el = document.getElementById("team-list");
    el.innerHTML = (team || []).map(m=> `<div><strong>${m.name}</strong> - ${m.role}<p>${m.bio}</p></div>`).join("");
  }

  // wire contact form (if present)
  setupContactForm();
}

document.addEventListener("DOMContentLoaded", init);
