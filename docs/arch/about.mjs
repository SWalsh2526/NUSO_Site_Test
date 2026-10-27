const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const entrances = [...document.querySelectorAll('[data-enter]')];
const grids = [...document.querySelectorAll('.board-grid')];
const counts = [...document.querySelectorAll('[data-count]')];
const menu = document.querySelector('.mobile-menu');
const animatedCounts = new WeakSet();
const countFrames = new Map();
let observer;
let rows = new Map();
let resizeFrame;

function finishCounts() {
  for (const frame of countFrames.values()) cancelAnimationFrame(frame);
  countFrames.clear();
  counts.forEach(element => { element.textContent = element.dataset.count; });
}

function countUp(element, delay = 0) {
  if (animatedCounts.has(element) || reducedMotion.matches) return;
  animatedCounts.add(element);
  const target = Number(element.dataset.count);
  const start = performance.now() + delay;
  // Keep the accessible value stable while the visible number counts up.
  element.setAttribute('aria-label', String(target));
  const tick = now => {
    const progress = Math.max(0, Math.min(1, (now - start) / 2200));
    element.textContent = String(Math.round(target * (1 - (1 - progress) ** 2)));
    if (progress < 1) countFrames.set(element, requestAnimationFrame(tick));
    else countFrames.delete(element);
  };
  countFrames.set(element, requestAnimationFrame(tick));
}

function reveal(element, delay = 0) {
  if (element.classList.contains('has-entered')) return;
  const opening = element.getBoundingClientRect().top < innerHeight && scrollY < 40;
  const entranceDelay = delay + (opening ? (element.matches('.resource-card,.tournament-panel') ? 220 : 80) : 30);
  element.style.setProperty('--enter-delay', `${entranceDelay}ms`);
  element.classList.add('has-entered');
  if (!reducedMotion.matches) {
    element.animate([
      { opacity:0, transform:'translateY(32px)' },
      { opacity:1, transform:'translateY(0)' }
    ], { duration:850, delay:entranceDelay, easing:'cubic-bezier(.25,.1,.25,1)', fill:'backwards' });
  }
  observer?.unobserve(element);
  element.querySelectorAll('[data-count]').forEach(counter => countUp(counter, entranceDelay + 500));
}

function observeEntrances() {
  observer?.disconnect();
  rows = new Map();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    root.classList.remove('about-motion');
    entrances.forEach(element => element.classList.add('has-entered'));
    finishCounts();
    return;
  }
  // Recalculate visual rows after responsive column changes.
  for (const grid of grids) {
    const groups = new Map();
    for (const card of grid.children) {
      const top = card.offsetTop;
      if (!groups.has(top)) groups.set(top, []);
      groups.get(top).push(card);
    }
    for (const row of groups.values()) for (const card of row) rows.set(card, row);
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const row = rows.get(entry.target);
      if (row) row.forEach((card, index) => reveal(card, index * 100));
      else reveal(entry.target);
    }
  }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
  root.classList.add('about-motion');
  // Start above-the-fold entrances directly; scrolling is not required.
  entrances.filter(element => !element.classList.contains('has-entered')).forEach(element => {
    const bounds = element.getBoundingClientRect();
    if (bounds.top >= innerHeight || bounds.bottom <= 0) return;
    const row = rows.get(element);
    if (row) row.forEach((card,index) => reveal(card,index * 100));
    else reveal(element);
  });
  const currentObserver = observer;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (observer !== currentObserver || reducedMotion.matches) return;
    entrances.filter(element => !element.classList.contains('has-entered')).forEach(element => currentObserver.observe(element));
  }));
}

function resetTilt(surface) {
  ['--tilt-x', '--tilt-y', '--glow-x', '--glow-y'].forEach(property => surface.style.removeProperty(property));
}

for (const surface of document.querySelectorAll('[data-tilt]')) {
  surface.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    const rect = surface.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    surface.style.setProperty('--tilt-x', `${(y - .5) * -4}deg`);
    surface.style.setProperty('--tilt-y', `${(x - .5) * 4}deg`);
    surface.style.setProperty('--glow-x', `${x * 100}%`);
    surface.style.setProperty('--glow-y', `${y * 100}%`);
  });
  surface.addEventListener('pointerleave', () => resetTilt(surface));
  surface.addEventListener('pointercancel', () => resetTilt(surface));
}

menu?.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
document.addEventListener('pointerdown', event => { if (menu && !menu.contains(event.target)) menu.open = false; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
function updateHeader() { root.classList.toggle('has-scrolled', scrollY > 30); }
addEventListener('scroll', updateHeader, { passive: true });
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(observeEntrances);
}, { passive: true });
reducedMotion.addEventListener('change', () => {
  document.querySelectorAll('[data-tilt]').forEach(resetTilt);
  observeEntrances();
});
document.addEventListener('visibilitychange', () => {
  root.classList.toggle('is-hidden', document.hidden);
  if (document.hidden) finishCounts();
});
updateHeader();
observeEntrances();

// A browser Back/Forward restore should feel like entering the page again.
addEventListener('pageshow', event => {
  if (!event.persisted) return;
  entrances.forEach(element => element.classList.remove('has-entered'));
  observeEntrances();
});
