/* Dingle Heart Safe: shared page behaviour (menu, reveal on scroll, ECG trace, phone action bar) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Mobile menu */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) { return; }
    menu.classList.remove('is-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); }
    document.body.classList.remove('menu-open');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) { closeMenu(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  /* Links to #find-aed on a page that has the finder: scroll to it and start it */
  var finderButton = document.querySelector('[data-aed-button]');
  var finderRoot = document.getElementById('find-aed');
  if (finderButton && finderRoot) {
    var triggers = document.querySelectorAll('a[href="#find-aed"]');
    for (var t = 0; t < triggers.length; t++) {
      triggers[t].addEventListener('click', function (e) {
        e.preventDefault();
        closeMenu();
        finderRoot.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
        finderButton.click();
      });
    }
  }

  /* Arriving from a "Nearest AED" link (page#find-aed): start the search straight away */
  if (finderButton && finderRoot && window.location.hash === '#find-aed') {
    window.setTimeout(function () { finderButton.click(); }, 350);
  }

  /* Reveal sections as they scroll into view */
  var revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      for (var i = 0; i < revealables.length; i++) { revealables[i].classList.add('is-visible'); }
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
      for (var j = 0; j < revealables.length; j++) { io.observe(revealables[j]); }
    }
  }

  /* Phone action bar: hide while a nearest-AED finder is on screen */
  var bar = document.querySelector('[data-action-bar]');
  var finder = document.querySelector('[data-aed-finder]');
  if (bar && finder && 'IntersectionObserver' in window) {
    var barIo = new IntersectionObserver(function (entries) {
      var latest = entries[entries.length - 1];
      bar.classList.toggle('is-hidden', latest.isIntersecting);
    }, { threshold: 0.2, rootMargin: '-72px 0px 0px 0px' });
    barIo.observe(finder);
  }

  /* Embedded map: on touch screens, require a tap before the iframe can capture scrolling */
  var mapShields = document.querySelectorAll('[data-map-shield]');
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  for (var m = 0; m < mapShields.length; m++) {
    (function (shield) {
      if (!coarse) { return; }
      shield.hidden = false;
      shield.addEventListener('click', function () {
        shield.classList.add('is-off');
        shield.setAttribute('aria-hidden', 'true');
        var frame = shield.parentNode ? shield.parentNode.querySelector('iframe') : null;
        setTimeout(function () {
          shield.hidden = true;
          if (frame) { frame.focus(); }
        }, 300);
      });
    })(mapShields[m]);
  }

  /* Videos: show a poster and only load YouTube when the visitor asks for it */
  var videos = document.querySelectorAll('[data-video]');
  for (var v = 0; v < videos.length; v++) {
    (function (box) {
      var id = box.getAttribute('data-video');
      var title = box.getAttribute('data-title') || 'Video';
      var button = box.querySelector('button');
      if (!id || !button) { return; }
      button.addEventListener('click', function () {
        var frame = document.createElement('iframe');
        frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
        frame.title = title;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.setAttribute('allowfullscreen', '');
        box.innerHTML = '';
        box.appendChild(frame);
        box.classList.add('is-playing');
      });
    })(videos[v]);
  }

  /* Background videos (video[data-autoplay]):
     - load only the videos that are visible at this screen size (side videos are hidden on phones)
     - phones get the smaller file (data-src-small)
     - nothing loads for reduced motion or data saver; the poster image stays instead
     - pause when scrolled off screen or the tab is hidden
     - a [data-video-toggle] button pauses and plays every video in its [data-video-group] */
  var autoVideos = document.querySelectorAll('video[data-autoplay]');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var PAUSE_KEY = 'dhs-video-paused';
  var userPaused = false;
  try { userPaused = window.localStorage.getItem(PAUSE_KEY) === '1'; } catch (err) { userPaused = false; }

  function isShown(el) { return el.getClientRects().length > 0; }
  function videoSrc(el) {
    var small = el.getAttribute('data-src-small');
    if (!small) { return el.getAttribute('data-src'); }
    var r = el.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var phone = window.matchMedia && window.matchMedia('(max-width: 700px), (max-height: 500px)').matches;
    var fits = r.width * dpr <= 540 && r.height * dpr <= 960;
    return (phone || fits) ? small : el.getAttribute('data-src');
  }
  function applyPosters() {
    for (var pi = 0; pi < autoVideos.length; pi++) {
      var pv = autoVideos[pi], poster = pv.getAttribute('data-poster');
      if (poster && !pv.getAttribute('poster') && isShown(pv)) { pv.setAttribute('poster', poster); }
    }
  }
  function playVideo(el) {
    if (userPaused || document.hidden || !el.src) { return; }
    var p = el.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  if (autoVideos.length) {
    applyPosters();
    var posterResize = null;
    window.addEventListener('resize', function () {
      clearTimeout(posterResize);
      posterResize = setTimeout(applyPosters, 250);
    });
    var groups = document.querySelectorAll('[data-video-group]');
    if (reduceMotion || saveData) {
      for (var g = 0; g < groups.length; g++) { groups[g].classList.add('videos-off'); }
    } else {
      var onScreen = new WeakMap();
      var videoIo = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          onScreen.set(entry.target, entry.isIntersecting);
          if (entry.isIntersecting) { playVideo(entry.target); } else { entry.target.pause(); }
        });
      }, { threshold: 0.05 }) : null;

      var loadVisible = function () {
        for (var a = 0; a < autoVideos.length; a++) {
          var el = autoVideos[a];
          if (el.getAttribute('data-loaded') || !isShown(el)) { continue; }
          el.muted = true;
          el.setAttribute('muted', '');
          el.src = videoSrc(el);
          el.setAttribute('data-loaded', '1');
          if (videoIo) { videoIo.observe(el); } else { playVideo(el); }
        }
      };
      loadVisible();

      var videoResize = null;
      window.addEventListener('resize', function () {
        clearTimeout(videoResize);
        videoResize = setTimeout(loadVisible, 250);
      });
      document.addEventListener('visibilitychange', function () {
        for (var b = 0; b < autoVideos.length; b++) {
          var el = autoVideos[b];
          if (document.hidden) { el.pause(); }
          else if (!videoIo || onScreen.get(el)) { playVideo(el); }
        }
      });

      var toggles = document.querySelectorAll('[data-video-toggle]');
      var setToggleState = function () {
        for (var c = 0; c < toggles.length; c++) {
          toggles[c].classList.toggle('is-paused', userPaused);
          var label = toggles[c].querySelector('.visually-hidden');
          if (label) { label.textContent = userPaused ? 'Play background video' : 'Pause background video'; }
        }
      };
      setToggleState();
      for (var d = 0; d < toggles.length; d++) {
        toggles[d].addEventListener('click', function () {
          userPaused = !userPaused;
          try { window.localStorage.setItem(PAUSE_KEY, userPaused ? '1' : '0'); } catch (err) { /* private mode */ }
          for (var e = 0; e < autoVideos.length; e++) {
            if (userPaused) { autoVideos[e].pause(); }
            else if (!videoIo || onScreen.get(autoVideos[e])) { playVideo(autoVideos[e]); }
          }
          setToggleState();
        });
      }
    }
  }

  /* Subtle background graphics that drift as you scroll */
  var decoSections = document.querySelectorAll('main .section:not(.photo-band):not(.donate-cta)');
  var decoKinds = ['ecg', 'contour', 'heart'];
  var decos = [];
  for (var s = 0; s < decoSections.length; s++) {
    var deco = document.createElement('div');
    deco.className = 'deco deco--' + decoKinds[s % decoKinds.length];
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<span class="deco__layer deco__a"></span><span class="deco__layer deco__b"></span>';
    decoSections[s].insertBefore(deco, decoSections[s].firstChild);
    decos.push(deco);
  }
  if (decos.length && !reduceMotion) {
    var decoTicking = false;
    var updateDeco = function () {
      decoTicking = false;
      var vh = window.innerHeight;
      for (var q = 0; q < decos.length; q++) {
        var r = decos[q].getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) { continue; }
        var p = (vh - r.top) / (vh + r.height);
        decos[q].style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3));
      }
    };
    window.addEventListener('scroll', function () {
      if (!decoTicking) { decoTicking = true; window.requestAnimationFrame(updateDeco); }
    }, { passive: true });
    window.addEventListener('resize', updateDeco);
    updateDeco();
  }

  /* Footer year */
  var year = document.querySelector('[data-year]');
  if (year) { year.textContent = String(new Date().getFullYear()); }
})();
