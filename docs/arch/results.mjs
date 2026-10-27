const root = document.documentElement;
const cards = [...document.querySelectorAll('.archive-card')];
const tabs = [...document.querySelectorAll('.archive-year-button')];
const tablist = document.querySelector('.archive-year-list');
const deck = document.querySelector('.archive-deck');
const controls = document.querySelector('.archive-controls');
const status = document.querySelector('.archive-position');
const steps = [...document.querySelectorAll('[data-step]')];
const menu = document.querySelector('.mobile-menu');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const motionButtons = [...document.querySelectorAll('[data-motion]')];
const lab = root.classList.contains('transition-lab');
const descriptions = { fade:'Fade out, then fade in. No overlapping text.', slide:'A horizontal slide with a soft stop.', lift:'A small upward movement with a fade.', combined:'A short sideways slide with a soft fade.' };
let motion = lab ? new URLSearchParams(location.search).get('motion') || 'fade' : 'combined';
if (!(motion in descriptions)) motion = 'fade';
let runningAnimations = [];
let selected = 0;
function setMotion(value) {
  motion = value;
  runningAnimations.forEach(animation => animation.cancel());
  runningAnimations = [];
  motionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.motion === motion)));
  const description = document.querySelector('.motion-description');
  if (description) description.textContent = descriptions[motion];
  const url = new URL(location.href);
  url.searchParams.set('motion', motion);
  history.replaceState(null, '', url);
}
motionButtons.forEach(button => button.addEventListener('click', () => setMotion(button.dataset.motion)));
if (lab) setMotion(motion);
function animateChange(previous, next, direction) {
  runningAnimations.forEach(animation => animation.cancel());
  runningAnimations = [];
  if (previous === next || reducedMotion.matches) return;
  const outgoing = cards[previous], incoming = cards[next];
  const ease = 'cubic-bezier(.22,1,.36,1)';
  if (motion === 'combined') {
    const travel = innerWidth <= 650 ? 32 : 64;
    runningAnimations = [
      outgoing.animate([
        { visibility:'visible', opacity:1, transform:'translate(0,0)' },
        { visibility:'visible', opacity:0, transform:`translate(${-direction * travel}px,0)` }
      ], { duration:240, easing:'cubic-bezier(.4,0,1,1)' }),
      incoming.animate([
        { opacity:0, transform:`translate(${direction * travel}px,0)` },
        { opacity:1, transform:'translate(0,0)' }
      ], { duration:560, delay:180, fill:'backwards', easing:ease })
    ];
    return;
  }
  const from = motion === 'slide' ? `translateX(${direction * 100}%)` : motion === 'lift' ? 'translateY(18px)' : 'none';
  const to = motion === 'slide' ? `translateX(${-direction * 100}%)` : motion === 'lift' ? 'translateY(-12px)' : 'none';
  const duration = motion === 'slide' ? 550 : motion === 'lift' ? 300 : 180;
  const outgoingAnimation = outgoing.animate([
    { visibility:'visible', opacity:1, transform:'none' },
    { visibility:'visible', opacity:motion === 'slide' ? 1 : 0, transform:to }
  ], { duration, easing:ease });
  const incomingAnimation = incoming.animate([
    { opacity:motion === 'slide' ? 1 : 0, transform:from },
    { opacity:1, transform:'none' }
  ], { duration:motion === 'slide' ? 550 : 400, delay:motion === 'slide' ? 0 : duration, fill:'backwards', easing:ease });
  runningAnimations = [outgoingAnimation, incomingAnimation];
}
let pointerStart;
let revealObserver;

function syncGeometry() {
  deck.style.height = `${cards[selected].offsetHeight}px`;
  tablist.style.setProperty('--year-x', `${tabs[selected].offsetLeft}px`);
  tablist.style.setProperty('--year-width', `${tabs[selected].offsetWidth}px`);
}

function selectYear(index, { updateURL = true, focus = false } = {}) {
  const previous = selected;
  selected = Math.max(0, Math.min(cards.length - 1, index));
  const narrow = innerWidth <= 650;
  cards.forEach((card, position) => {
    const offset = position - selected;
    const distance = Math.abs(offset);
    const active = distance === 0;
    card.classList.toggle('is-active', active);
    card.inert = !active;
    card.setAttribute('aria-hidden', String(!active));
    card.tabIndex = active ? 0 : -1;
    card.style.zIndex = String(10 - distance);
    card.style.setProperty('--card-x', `${offset * (narrow ? 11 : 28)}px`);
    card.style.setProperty('--card-y', `${distance * (narrow ? 8 : 10)}px`);
    card.style.setProperty('--card-angle', `${offset * (narrow ? 1.8 : 2.7)}deg`);
    card.style.setProperty('--card-scale', String(Math.max(.78, 1 - distance * .055)));
    card.style.setProperty('--card-opacity', distance > 2 ? '0' : '1');
    card.style.setProperty('--card-brightness', active ? '1' : distance === 1 ? '.85' : '.7');
    tabs[position].setAttribute('aria-selected', String(active));
    tabs[position].tabIndex = active ? 0 : -1;
  });
  steps.forEach(button => {
    button.disabled = Number(button.dataset.step) < 0 ? selected === 0 : selected === cards.length - 1;
  });
  status.textContent = `${cards[selected].dataset.year} · ${selected + 1} of ${cards.length}`;
  syncGeometry();
  animateChange(previous, selected, selected > previous ? 1 : -1);
  if (focus) tabs[selected].focus({ preventScroll: true });
  if (updateURL) history.replaceState(null, '', `#${cards[selected].id}`);
}

function selectFromHash() {
  const index = cards.findIndex(card => `#${card.id}` === location.hash);
  if (index >= 0) selectYear(index, { updateURL: false });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectYear(index));
  tab.addEventListener('keydown', event => {
    const next = event.key === 'ArrowRight' ? selected + 1
      : event.key === 'ArrowLeft' ? selected - 1
      : event.key === 'Home' ? 0
      : event.key === 'End' ? cards.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    selectYear(next, { focus: true });
  });
});
steps.forEach(button => button.addEventListener('click', () => selectYear(selected + Number(button.dataset.step))));

deck.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || event.target.closest('a, button')) return;
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  deck.setPointerCapture(event.pointerId);
});
deck.addEventListener('pointerup', event => {
  if (!pointerStart || event.pointerId !== pointerStart.id) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) selectYear(selected + (dx < 0 ? 1 : -1));
  pointerStart = undefined;
});
deck.addEventListener('pointercancel', () => { pointerStart = undefined; });

menu?.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
document.addEventListener('pointerdown', event => { if (menu && !menu.contains(event.target)) menu.open = false; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu?.open) {
    menu.open = false;
    menu.querySelector('summary').focus();
  }
});
function updateHeader() { root.classList.toggle('has-scrolled', scrollY > 30); }
function configureEntrances() {
  revealObserver?.disconnect();
  const elements = [...document.querySelectorAll('[data-enter]')];
  root.classList.toggle('archive-motion', !reducedMotion.matches && 'IntersectionObserver' in window);
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    elements.forEach(element => element.classList.add('has-entered'));
    return;
  }
  function enter(element) {
    if (element.classList.contains('has-entered')) return;
    element.classList.add('has-entered');
    element.animate([{ opacity:0, translate:'0 32px' },{ opacity:1, translate:'0 0' }], {
      duration:850, delay:element === deck ? 280 : element === tablist ? 160 : 80,
      easing:'cubic-bezier(.25,.1,.25,1)', fill:'backwards'
    });
    revealObserver?.unobserve(element);
  }
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      enter(entry.target);
    });
  }, { threshold: .12 });
  elements.forEach(element => {
    const bounds = element.getBoundingClientRect();
    if (bounds.top < innerHeight && bounds.bottom > 0) enter(element);
  });
  const currentObserver = revealObserver;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (revealObserver !== currentObserver || reducedMotion.matches) return;
    elements.filter(element => !element.classList.contains('has-entered')).forEach(element => currentObserver.observe(element));
  }));
}

cards.forEach(card => { card.setAttribute('role', 'tabpanel'); card.setAttribute('aria-labelledby', `tab-${card.dataset.year}`); });
root.classList.add('archive-enhanced');
tablist.hidden = false;
controls.hidden = false;
selectYear(0, { updateURL: false });
selectFromHash();
configureEntrances();
updateHeader();
if ('ResizeObserver' in window) {
  const sizes = new ResizeObserver(syncGeometry);
  cards.forEach(card => sizes.observe(card));
  sizes.observe(tablist);
}
addEventListener('resize', () => selectYear(selected, { updateURL: false }), { passive: true });
addEventListener('hashchange', selectFromHash);
addEventListener('scroll', updateHeader, { passive: true });
reducedMotion.addEventListener('change', configureEntrances);
document.fonts?.ready.then(syncGeometry);
document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));

addEventListener('pageshow', event => {
  if (!event.persisted) return;
  document.querySelectorAll('[data-enter]').forEach(element => element.classList.remove('has-entered'));
  configureEntrances();
});
