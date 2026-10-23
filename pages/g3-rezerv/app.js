/* Г-В · Мистер В — страница-резерв гостевой ветки. Интерактива нет: слот
 * занят, содержание появится только после передачи материалов гостем. */
(() => {
  'use strict';
  const { $, esc } = ZM, U = ZM.url;
  ZM.topbar({ crumb: 'Гость В · зарезервировано' });

  const nav = $('#guestNav');
  if (nav && ZM.GUEST_POINTS) {
    const i = ZM.GUEST_POINTS.findIndex((g) => g.page && g.page.includes('/g3-'));
    const prev = ZM.GUEST_POINTS[i - 1], next = ZM.GUEST_POINTS[i + 1];
    nav.innerHTML =
      (prev ? `<a href="${U(prev.page)}"><b>К</b> Назад: ${esc(prev.title)}</a>` : '') +
      (next ? `<a href="${U(next.page)}"><b>П</b> Далее: ${esc(next.title)}</a>` : '') +
      `<a href="${U('index.html#guests-sec')}"><b>≡</b> Все гостевые пункты</a>`;
  }
})();
