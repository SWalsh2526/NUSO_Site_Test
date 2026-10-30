export function initWillie(reduceMotion) {
  const scene = document.querySelector('[data-willie-scene]');
  const button = scene?.querySelector('[data-willie]');
  if (!button) return;
  const status = scene.querySelector('[data-willie-status]');
  const section = scene.closest('.about-section');
  function sizeTextShift() {
    const layout = getComputedStyle(section);
    const style = getComputedStyle(button);
    const stacked = layout.gridTemplateColumns.trim().split(/\s+/).length === 1;
    const angle = parseFloat(style.getPropertyValue('--willie-angle')) * Math.PI / 180;
    const reach = parseFloat(style.height) * Math.sin(angle)
      + parseFloat(style.getPropertyValue('--willie-out')) - parseFloat(style.right);
    const shift = stacked ? 0 : Math.max(0, reach - parseFloat(layout.columnGap) + 20);
    section.style.setProperty('--willie-text-shift', `${Math.ceil(shift)}px`);
  }
  sizeTextShift();
  addEventListener('resize', sizeTextShift, { passive:true });
  if ('ResizeObserver' in window) new ResizeObserver(sizeTextShift).observe(scene);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let ready = false;
  let visible = false;
  let appeared = false;
  let greetingTimer = 0;

  function finishGreeting() {
    clearTimeout(greetingTimer);
    greetingTimer = 0;
    button.classList.remove('is-arriving', 'is-greeting', 'is-curious');
    button.removeAttribute('aria-busy');
    status.textContent = '';
  }

  function greet(automatic = false) {
    if (!ready || !visible || document.hidden || greetingTimer) return;
    button.classList.remove('is-curious');
    button.classList.add(automatic ? 'is-arriving' : 'is-greeting');
    button.setAttribute('aria-busy', 'true');
    if (!automatic) status.textContent = 'Willie waves hello.';
    greetingTimer = setTimeout(finishGreeting, automatic ? 3250 : 1900);
  }

  function show() {
    if (!ready || !visible || document.hidden) return;
    button.hidden = false;
    if (!appeared) {
      appeared = true;
      if (!reduceMotion.matches) greet(true);
    }
  }

  button.addEventListener('click', () => greet());
  button.addEventListener('animationend', event => {
    if (event.animationName === 'willie-peek') finishGreeting();
  });
  scene.addEventListener('pointermove', event => {
    if (!finePointer.matches || event.pointerType === 'touch' || greetingTimer || !visible) return;
    const bounds = scene.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const mascotBounds = button.getBoundingClientRect();
    // Follow the right-hand hiding place, including the exposed paw.
    const nearby = x > bounds.width - 145 && x < bounds.width + 125 && event.clientY > mascotBounds.top - 50 && event.clientY < mascotBounds.bottom + 20;
    button.classList.toggle('is-curious', nearby);
  });
  scene.addEventListener('pointerleave', () => button.classList.remove('is-curious'));
  scene.addEventListener('click', event => {
    if (button.contains(event.target)) return;
    const bounds = scene.getBoundingClientRect();
    const mascotBounds = button.getBoundingClientRect();
    if (event.clientX > bounds.right - 130 && event.clientY > mascotBounds.top - 30 && event.clientY < mascotBounds.bottom + 10) greet();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) show();
      else finishGreeting();
    }, { threshold: .65 });
    observer.observe(scene);
  } else {
    visible = true;
  }

  const artwork = new Image();
  artwork.src = new URL('./assets/flat-willie-soft-outline.png', import.meta.url).href;
  artwork.decode().then(() => { ready = true; show(); }).catch(() => { button.hidden = true; });
  reduceMotion.addEventListener('change', finishGreeting);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishGreeting();
    else show();
  });
}
