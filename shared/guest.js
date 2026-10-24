/* ZM.guest — общий полиш гостевых страниц.
 * Появление блоков при прокрутке (reveal со стаггером), аккуратные
 * микро-анимации. Скрипт необязательный: без него и без JS страницы
 * работают как раньше — классы вешаются только отсюда. */
(function () {
  'use strict';
  var d = document;
  if (!d.querySelector || !d.querySelector('.guest-body')) return;
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
  if (reduce || !('IntersectionObserver' in window)) return;

  /* 1. reveal: блоки въезжают снизу лёгкой волной */
  var SEL = '.g-head,.g-panel,.g-kv,.g-facts,.g-chapters,.g-foot,.g-letter,.g-hero-strip';
  var els = [].slice.call(d.querySelectorAll(SEL));
  if (!els.length) return;
  var io = null;
  var shown = 0;
  io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: .06 });
  els.forEach(function (el, i) {
    el.classList.add('rv');
    el.style.transitionDelay = Math.min(320, (i % 5) * 55) + 'ms';
    io.observe(el);
  });
  /* страховка: ничего не должно остаться невидимым */
  setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 2800);

  /* 2. микро-ответ: заголовки секций чуть подсвечиваются при появлении */
  [].slice.call(d.querySelectorAll('.g-head h2')).forEach(function (h) {
    h.style.transition = 'text-shadow .5s ease';
    new IntersectionObserver(function (es, obs) {
      if (es[0].isIntersecting) { h.style.textShadow = '0 0 26px color-mix(in srgb,var(--tone) 38%,#0000)'; if (obs) obs.disconnect(); }
    }, { threshold: .4 }).observe(h);
  });
})();
