/* =====================================================================
   Портфолио Артёма Некрасова — поведение страницы.
   Без зависимостей и без сборки: обычный скрипт, работает и с диска, и с хостинга.
   Каждый блок ниже — отдельная функция; порядок запуска в самом конце файла.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var DESKTOP = 900;
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

  function motionOff() { return reduceMq.matches || root.classList.contains('no-motion'); }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---------- режим черновика: index.html?draft ---------- */
  function initDraft() {
    if (!/[?&]draft\b/.test(location.search)) return;
    root.classList.add('is-draft');
    var bar = $('[data-draftbar]');
    if (bar) bar.hidden = false;
  }

  /* ---------- переключатель анимаций в подвале ---------- */
  function initMotionToggle() {
    var btn = $('[data-motion-toggle]');
    function render() {
      var off = root.classList.contains('no-motion');
      if (!btn) return;
      btn.textContent = off ? 'Анимации: выключены' : 'Анимации: включены';
      btn.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    if (store('motion') === 'off') root.classList.add('no-motion');
    render();
    if (!btn) return;
    btn.addEventListener('click', function () {
      var off = root.classList.toggle('no-motion');
      store('motion', off ? 'off' : 'on');
      render();
      onScroll();
    });
  }

  /* ---------- заголовки во всю ширину ---------- */
  function fitOne(el) {
    var inner = $('.fit', el);
    if (!inner) return;
    if (el.classList.contains('hero__ghost')) {            // контур повторяет размер фамилии под ним
      el.style.fontSize = $('.hero__name .hero__last').style.fontSize;
      return;
    }
    el.style.fontSize = '';
    if (el.hasAttribute('data-fit-mobile') && window.innerWidth >= DESKTOP) return;
    var cs = getComputedStyle(el);
    var avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var width = inner.getBoundingClientRect().width;
    if (!avail || !width) return;
    var size = parseFloat(cs.fontSize) * avail / width;
    var max = parseFloat(el.getAttribute('data-fit-max'));
    if (max) size = Math.min(size, window.innerHeight * max);
    el.style.fontSize = size.toFixed(2) + 'px';
    if (el.classList.contains('hero__last') && window.innerWidth >= DESKTOP) {
      // на низких экранах уменьшаем фамилию ровно настолько, чтобы обложка целиком помещалась в окно
      var extra = el.closest('.hero').offsetHeight - window.innerHeight;
      if (extra > 0) {
        size = Math.max(size - extra / 0.78, window.innerHeight * 0.24);
        el.style.fontSize = size.toFixed(2) + 'px';
      }
    }
  }
  function fitAll() { $$('[data-fit], [data-fit-mobile]').forEach(fitOne); }

  /* ---------- вступление на обложке ---------- */
  function initHero() {
    var done = false;
    function ready() {
      if (done) return;
      done = true;
      fitAll();
      // запускаем вступление с первым кадром; если кадров нет (вкладка в фоне), всё равно показываем обложку
      var shown = false;
      function show() { if (shown) return; shown = true; root.classList.add('is-ready'); }
      requestAnimationFrame(show);
      setTimeout(show, 1200);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
    setTimeout(ready, 900);
    // шрифты могут догрузиться позже и изменить высоту текста на обложке: тогда подгоняем фамилию заново
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', fitAll);
    var top = $('.hero__top');
    if (top && 'ResizeObserver' in window) new ResizeObserver(fitAll).observe(top);
  }

  /* ---------- появление при прокрутке ---------- */
  function initReveal() {
    // «шторка» заголовков: обрезаем внутреннюю обёртку, а наблюдаем за самим заголовком —
    // элемент, целиком скрытый собственным clip-path, наблюдатель считает невидимым
    $$('.reveal-clip').forEach(function (el) {
      var inner = document.createElement('span');
      inner.className = 'clip-in';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    });
    var items = $$('.reveal, .reveal-clip');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    // соседние элементы появляются с небольшим сдвигом по времени
    items.forEach(function (el) {
      if (!el.classList.contains('reveal') || el.style.getPropertyValue('--d')) return;
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0 && !getComputedStyle(el).getPropertyValue('--d').trim()) el.style.setProperty('--d', Math.min(i * 0.07, 0.42) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- счётчики ---------- */
  function formatCount(value, el) {
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var text = value.toFixed(decimals).replace('.', ',');
    if (el.hasAttribute('data-group')) text = text.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return text + (el.getAttribute('data-suffix') || '');
  }
  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var finalText = el.textContent;
    if (motionOff() || isNaN(target)) return;
    var start = null;
    var duration = 950;
    function frame(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      if (p < 1) {
        el.textContent = formatCount(target * eased, el);
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
      }
    }
    requestAnimationFrame(frame);
  }
  function initCounters() {
    var items = $$('[data-count]');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- навигация: цвет под секцией, активный пункт, скрытие при прокрутке вниз ---------- */
  var nav, themed, navLinks, lastY = 0;
  function initNav() {
    nav = $('[data-nav]');
    themed = $$('[data-theme]').filter(function (el) { return el !== nav; });
    navLinks = $$('.nav__links a');
    if (nav) nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });
  }
  function updateNav(y) {
    if (!nav) return;
    var probe = nav.offsetHeight / 2;
    var theme = 'dark';
    for (var i = 0; i < themed.length; i++) {
      var r = themed[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { theme = themed[i].getAttribute('data-theme'); break; }
    }
    nav.setAttribute('data-on', theme);
    nav.classList.toggle('is-stuck', y > 24);
    var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (goingDown && y > window.innerHeight * 0.6) nav.classList.add('is-hidden');
    else if (goingUp || y < 80) nav.classList.remove('is-hidden');

    var mid = window.innerHeight * 0.4;
    navLinks.forEach(function (a) {
      var target = $(a.getAttribute('href'));
      if (!target) return;
      var r = target.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- мобильное меню ---------- */
  function initMenu() {
    var menu = $('[data-menu]');
    var openBtn = $('[data-menu-open]');
    var closeBtn = $('[data-menu-close]');
    if (!menu || !openBtn) return;
    function open() {
      menu.hidden = false;
      openBtn.setAttribute('aria-expanded', 'true');
      root.style.overflow = 'hidden';
      closeBtn.focus();
    }
    function close(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      openBtn.setAttribute('aria-expanded', 'false');
      root.style.overflow = '';
      if (returnFocus) openBtn.focus();
    }
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', function () { close(true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { close(true); return; }
      if (e.key !== 'Tab') return;
      var focusable = $$('a, button', menu);
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= DESKTOP) close(false); });
  }

  /* ---------- «На слайдах / В жизни» ---------- */
  function initGags() {
    $$('[data-gag]').forEach(function (gag) {
      var btn = $('.gag__toggle', gag);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var life = gag.classList.toggle('is-life');
        btn.setAttribute('aria-pressed', life ? 'true' : 'false');
      });
    });
  }

  /* ---------- переключатель кейсов ---------- */
  var casebar, cases, caseLinks;
  function initCasebar() {
    casebar = $('[data-casebar]');
    if (!casebar) return;
    cases = $$('[data-case]');
    caseLinks = $$('[data-case-link]', casebar);
    casebar.classList.add('is-off');
    casebar.hidden = false;
  }
  function updateCasebar() {
    if (!casebar) return;
    var vh = window.innerHeight, current = null;
    cases.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.top < vh * 0.55 && r.bottom > vh * 0.45) current = c.getAttribute('data-case');
    });
    casebar.classList.toggle('is-off', current === null);
    caseLinks.forEach(function (a) {
      if (a.getAttribute('data-case-link') === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- лёгкий параллакс фотографий (только десктоп) ---------- */
  var parallaxItems = [];
  function initParallax() { parallaxItems = $$('[data-parallax]'); }
  function updateParallax() {
    var active = window.innerWidth >= DESKTOP && !motionOff();
    parallaxItems.forEach(function (el) {
      if (!active) { el.style.removeProperty('--py'); return; }
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      var offset = (r.top + r.height / 2) - window.innerHeight / 2;
      el.style.setProperty('--py', (offset * parseFloat(el.getAttribute('data-parallax'))).toFixed(1) + 'px');
    });
  }

  /* ---------- копирование почты ---------- */
  function initCopy() {
    var status = $('[data-copy-status]');
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        function say(message) { if (status) status.textContent = message; }
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          say('Не удалось скопировать. Выделите адрес вручную.');
          return;
        }
        navigator.clipboard.writeText(text).then(
          function () { say('Почта скопирована: ' + text); },
          function () { say('Не удалось скопировать. Выделите адрес вручную.'); }
        );
      });
    });
  }

  /* ---------- общий обработчик прокрутки ---------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset;
      updateNav(y);
      updateCasebar();
      updateParallax();
      lastY = y;
      ticking = false;
    });
  }

  /* ---------- запуск ---------- */
  initDraft();
  initMotionToggle();
  initNav();
  initMenu();
  initHero();
  initReveal();
  initCounters();
  initGags();
  initCasebar();
  initParallax();
  initCopy();
  fitAll();
  onScroll();

  var resizeTimer;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fitAll(); onScroll(); }, 80);
  });
  window.addEventListener('load', fitAll);
})();
