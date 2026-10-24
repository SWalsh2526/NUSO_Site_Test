import { daysUntil, countdownText } from './dates.mjs';
import { initWillie } from './willie.mjs?v=3';

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const story = document.querySelector('.hero-story');
const stage = document.querySelector('.hero-stage');
const arch = document.querySelector('.arch-transform');
const copy = document.querySelector('.hero-copy');
const cue = document.querySelector('.scroll-cue');
const ground = document.querySelector('.hero-ground');
const locationLabel = document.querySelector('.hero-location');
const menu = document.querySelector('.mobile-menu');
const cards = [...document.querySelectorAll('[data-date]')];
const played = new WeakSet();
const activeCounts = new Map();
let frame = 0;
let heroEnabled = false;
let travel = 1;
let start = 0;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value) => value * value * (3 - 2 * value);

function updateHero() {
  frame = 0;
  root.classList.toggle('has-scrolled', scrollY > 30);
  if (!heroEnabled) return;
  const progress = clamp((scrollY - start) / travel);
  const scale = 1 + progress * progress * (innerWidth <= 600 ? 1.8 : 3.2);
  arch.style.transform = `translate3d(0,${-progress * stage.clientHeight * .3}px,0) scale(${scale})`;
  arch.style.opacity = 1 - smooth(clamp((progress - .78) / .22));
  copy.style.opacity = 1 - smooth(clamp((progress - .04) / .3));
  copy.style.transform = `translate(-50%,calc(-12% - ${progress * 90}px))`;
  const copyHidden = progress > .34;
  copy.inert = copyHidden;
  copy.style.visibility = copyHidden ? 'hidden' : '';
  cue.style.opacity = 1 - clamp(progress / .16);
  cue.style.visibility = progress > .16 ? 'hidden' : '';
  locationLabel.style.opacity = 1 - clamp(progress / .2);
  ground.style.transform = `scale(${1 + progress * .6}) translateY(${progress * 80}px)`;
  ground.style.opacity = .23 * (1 - progress);
}

function scheduleHero() {
  if (!frame && !document.hidden) frame = requestAnimationFrame(updateHero);
}

function configureMotion() {
  // Use the rendered hero height, rather than disabling normal laptop windows.
  const stageFits = stage.clientHeight <= innerHeight + 2;
  heroEnabled = !reduceMotion.matches && stageFits;
  root.classList.toggle('motion-enabled', heroEnabled);
  start = story.getBoundingClientRect().top + scrollY;
  travel = Math.max(1, story.offsetHeight - stage.clientHeight);
  if (!heroEnabled) {
    [arch, copy, cue, ground, locationLabel].forEach(element => element.removeAttribute('style'));
    copy.inert = false;
    document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
  }
  if (reduceMotion.matches) {
    for (const [card, animation] of activeCounts) {
      cancelAnimationFrame(animation.frame);
      card.querySelector('.count-value').textContent = countdownText(animation.days).value;
    }
    activeCounts.clear();
    root.style.removeProperty('--ambient-x');
    root.style.removeProperty('--ambient-y');
    document.querySelectorAll('[data-tilt]').forEach(resetTilt);
  }
  scheduleHero();
}

function updateCount(card, animate = false) {
  const days = daysUntil(card.dataset.date);
  const previous = activeCounts.get(card);
  if (previous) cancelAnimationFrame(previous.frame);
  activeCounts.delete(card);
  const text = countdownText(days);
  const container = card.querySelector('.countdown');
  const value = card.querySelector('.count-value');
  container.setAttribute('aria-label', text.accessible);
  container.classList.toggle('is-past', days <= 0);
  card.querySelector('.count-label').textContent = text.label;
  if (!animate || reduceMotion.matches || days <= 0 || document.hidden) {
    value.textContent = text.value;
    return;
  }
  const animation = { start: performance.now(), frame: 0, days };
  value.textContent = '0';
  const tick = now => {
    const progress = clamp((now - animation.start) / 1150);
    value.textContent = String(Math.round(days * (1 - (1 - progress) ** 3)));
    if (progress < 1 && !document.hidden) animation.frame = requestAnimationFrame(tick);
    else { value.textContent = text.value; activeCounts.delete(card); }
  };
  animation.frame = requestAnimationFrame(tick);
  activeCounts.set(card, animation);
}

function resetTilt(surface) {
  ['--tilt-x', '--tilt-y', '--glow-x', '--glow-y'].forEach(property => surface.style.removeProperty(property));
}

for (const surface of document.querySelectorAll('[data-tilt]')) {
  surface.addEventListener('pointermove', event => {
    if (!finePointer.matches || reduceMotion.matches || event.pointerType === 'touch') return;
    const rect = surface.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    surface.style.setProperty('--tilt-x', `${(y - .5) * -4}deg`);
    surface.style.setProperty('--tilt-y', `${(x - .5) * 4}deg`);
    surface.style.setProperty('--glow-x', `${x * 100}%`);
    surface.style.setProperty('--glow-y', `${y * 100}%`);
  });
  surface.addEventListener('pointerleave', () => resetTilt(surface));
  surface.addEventListener('pointercancel', () => resetTilt(surface));
}

menu.addEventListener('click', event => { if (event.target.closest('a')) menu.open = false; });
document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) menu.open = false; });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
});
document.addEventListener('pointermove', event => {
  if (reduceMotion.matches || !finePointer.matches || event.pointerType === 'touch' || scrollY > story.offsetHeight) return;
  root.style.setProperty('--ambient-x', `${(event.clientX / innerWidth - .5) * 25}px`);
  root.style.setProperty('--ambient-y', `${(event.clientY / innerHeight - .5) * 18}px`);
}, { passive: true });

cards.forEach(card => updateCount(card));
root.classList.add('has-countdowns');
configureMotion();
initWillie(reduceMotion);

if ('IntersectionObserver' in window) {
  const reveals = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      reveals.unobserve(entry.target);
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(element => reveals.observe(element));
  const counts = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || played.has(entry.target)) return;
      played.add(entry.target);
      updateCount(entry.target, true);
      counts.unobserve(entry.target);
    });
  }, { threshold: .3 });
  cards.forEach(card => counts.observe(card));
} else {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));
}

addEventListener('scroll', scheduleHero, { passive: true });
addEventListener('resize', configureMotion, { passive: true });
reduceMotion.addEventListener('change', configureMotion);
addEventListener('pageshow', scheduleHero);
document.addEventListener('visibilitychange', () => {
  root.classList.toggle('is-hidden', document.hidden);
  if (document.hidden) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const [card, animation] of activeCounts) {
      cancelAnimationFrame(animation.frame);
      card.querySelector('.count-value').textContent = countdownText(animation.days).value;
    }
    activeCounts.clear();
  } else { cards.forEach(card => updateCount(card)); scheduleHero(); }
});
setInterval(() => { if (!document.hidden) cards.forEach(card => { if (!activeCounts.has(card)) updateCount(card); }); }, 60000);
