/* Dingle Heart Safe: nearest AED finder
 *
 * Uses the phone's location to pick the nearest public-access AED from
 * aed-data.js, shows it, and offers Google Maps directions.
 *
 * Markup contract: a root element with [data-aed-finder] containing
 *   [data-aed-button]   the trigger button
 *   [data-aed-status]   a live region for progress and errors
 *   [data-aed-result]   where the nearest-AED card renders
 *   [data-aed-list]     optional: renders the N nearest (data-aed-list="5")
 * The root gets data-state="idle|locating|found|error" for styling.
 * Set data-aed-auto="false" on the root to disable the automatic hand-off
 * to Google Maps. The hand-off only happens on touch devices, with a
 * precise fix, and while the visitor's tap still counts as user activation;
 * otherwise the visitor taps the directions button, which always works.
 *
 * Elsewhere on the page, [data-aed-directory] renders every AED grouped by
 * area and [data-aed-updated] shows the date the list was last refreshed.
 */
(function () {
  'use strict';

  var AEDS = window.DHS_AEDS || [];
  /* AEDs on the map that Dingle Heart Safe does not look after ("managed": false in aed-data.js) */
  function unmanagedHtml(aed, tag) {
    return aed.managed === false ? '<' + tag + ' class="aed-unmanaged">(Not a Dingle Heart Safe Managed AED)</' + tag + '>' : '';
  }
  var MAP_URL = window.DHS_AED_MAP_URL ||
    'https://www.google.com/maps/d/viewer?mid=1nF0UF266j_APUEpj72y7i12Iqt6UEq0';
  var WALK_LIMIT_M = 1500;      // walk if the nearest AED is within this, otherwise drive
  var HANDOFF_DELAY_MS = 900;   // let the result render and be announced before leaving
  var COARSE_FIX_M = 250;       // a fix worse than this is "approximate": no automatic hand-off
  var WATCHDOG_MS = 25000;      // give up waiting for the browser after this
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function toRad(d) { return d * Math.PI / 180; }

  function distanceM(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(m) {
    if (m < 950) { return Math.max(10, Math.round(m / 10) * 10) + ' m'; }
    return (m / 1000).toFixed(m < 9950 ? 1 : 0) + ' km';
  }

  function travelMode(m) { return m <= WALK_LIMIT_M ? 'walking' : 'driving'; }

  function directionsUrl(aed, mode) {
    return 'https://www.google.com/maps/dir/?api=1' +
      '&destination=' + encodeURIComponent(aed.lat + ',' + aed.lng) +
      '&travelmode=' + mode +
      '&dir_action=navigate';
  }

  function rank(lat, lng) {
    return AEDS.map(function (aed) {
      return { aed: aed, m: distanceM(lat, lng, aed.lat, aed.lng) };
    }).sort(function (x, y) { return x.m - y.m; });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isHandheld() {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      ('ontouchstart' in window && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }

  /* True only while the browser still treats the visitor's tap as live user
     activation. A script navigation inside that window can open the Google
     Maps app; outside it the visitor's own tap on the link is the safe path. */
  function activationLive() {
    var ua = navigator.userActivation;
    return !!(ua && ua.isActive);
  }

  function getPosition(highAccuracy) {
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 12000 : 10000,
        maximumAge: 60000
      });
    });
  }

  function locate() {
    return getPosition(true).catch(function (err) {
      // GPS can time out indoors; fall back to network positioning once.
      if (err && err.code === 3) { return getPosition(false); }
      throw err;
    });
  }

  function errorMessage(err) {
    if (err && err.noData) {
      return 'The AED list could not be loaded. Open the AED map instead, or call 112.';
    }
    if (!err || err.unsupported) {
      return 'This browser cannot share your location.';
    }
    if (err.code === 1) {
      return 'Location access is blocked for this site. Allow location in your browser settings and try again.';
    }
    if (err.code === 3) {
      return 'Finding your location is taking too long. Try again, or open the AED map.';
    }
    return 'Your location could not be found. Move somewhere with better signal and try again.';
  }

  function resultHtml(hit, mode, coarse, accuracy, handoffNow) {
    var aed = hit.aed;
    var url = directionsUrl(aed, mode);
    var hint = handoffNow
      ? 'Opening Google Maps now. If it does not open, tap the button above.'
      : 'Tap the button to open directions in Google Maps: ' + (mode === 'walking' ? 'a walking route, because the AED is close.' : 'a driving route.');
    return '' +
      '<div class="aed-result" role="group" aria-label="Nearest AED">' +
        '<p class="aed-result__eyebrow">Nearest AED <span class="aed-result__dist">' + esc(formatDistance(hit.m)) + ' in a straight line</span></p>' +
        '<h2 class="aed-result__name">' + esc(aed.name) + '</h2>' +
        '<p class="aed-result__area">' + esc(aed.area) + '</p>' +
        (aed.note ? '<p class="aed-result__note">' + esc(aed.note) + '</p>' : '') +
        unmanagedHtml(aed, 'p') +
        (coarse
          ? '<p class="aed-result__warn">Your phone only gave an approximate location (to about ' + esc(formatDistance(accuracy)) + '), so check the list below or <a href="' + esc(MAP_URL) + '" target="_blank" rel="noopener">open the AED map</a>.</p>'
          : '') +
        '<a class="btn btn--maps" href="' + esc(url) + '" target="_blank" rel="noopener">' +
          '<svg class="btn__icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>' +
          'Open directions in Google Maps' +
        '</a>' +
        '<p class="aed-result__hint">' + esc(hint) + '</p>' +
      '</div>';
  }

  function listHtml(hits, count) {
    var items = hits.slice(0, count).map(function (hit) {
      var aed = hit.aed;
      return '<li class="aed-list__item">' +
        '<div class="aed-list__text">' +
          '<span class="aed-list__name">' + esc(aed.name) + '</span>' +
          '<span class="aed-list__area">' + esc(aed.area) + (aed.note ? ' · ' + esc(aed.note) : '') + unmanagedHtml(aed, 'span') + '</span>' +
        '</div>' +
        '<span class="aed-list__dist">' + esc(formatDistance(hit.m)) + '</span>' +
        '<a class="aed-list__link" href="' + esc(directionsUrl(aed, travelMode(hit.m))) + '" target="_blank" rel="noopener">Directions<span class="visually-hidden"> to ' + esc(aed.name) + '</span></a>' +
      '</li>';
    }).join('');
    return '<h2 class="aed-list__title">The ' + count + ' AEDs closest to you</h2><ol class="aed-list">' + items + '</ol>';
  }

  function init(root) {
    var button = root.querySelector('[data-aed-button]');
    var status = root.querySelector('[data-aed-status]');
    var result = root.querySelector('[data-aed-result]');
    var list = root.querySelector('[data-aed-list]');
    var auto = root.getAttribute('data-aed-auto') !== 'false';
    if (!button || !status || !result) { return; }
    var idleLabel = button.innerHTML;
    var busy = false;
    var token = null;
    var handoffTimer = null;

    function setState(state) { root.setAttribute('data-state', state); }

    function cancelHandoff() {
      if (handoffTimer) { clearTimeout(handoffTimer); handoffTimer = null; }
    }

    function setBusy(flag) {
      busy = flag;
      button.setAttribute('aria-disabled', flag ? 'true' : 'false');
      button.classList.toggle('is-busy', flag);
    }

    function reset() {
      cancelHandoff();
      token = null;
      setBusy(false);
      button.innerHTML = idleLabel;
      status.textContent = '';
      result.innerHTML = '';
      if (list) { list.innerHTML = ''; }
    }

    function showError(err) {
      reset();
      setState('error');
      status.innerHTML =
        '<span class="aed-status__message">' + esc(errorMessage(err)) + '</span> ' +
        '<a class="aed-status__link" href="' + esc(MAP_URL) + '" target="_blank" rel="noopener">Open the AED map instead</a>';
      button.focus({ preventScroll: true });
    }

    function showResult(position) {
      var c = position.coords;
      var hits = rank(c.latitude, c.longitude);
      if (!hits.length) { return showError({ noData: true }); }
      var nearest = hits[0];
      var coarse = !!(c.accuracy && c.accuracy > COARSE_FIX_M);
      var mode = travelMode(coarse ? Infinity : nearest.m);
      var handoffNow = auto && isHandheld() && !coarse && activationLive();

      setBusy(false);
      button.innerHTML = idleLabel;
      setState('found');
      result.innerHTML = resultHtml(nearest, mode, coarse, c.accuracy, handoffNow);
      if (list) {
        list.innerHTML = listHtml(hits, parseInt(list.getAttribute('data-aed-list'), 10) || 5);
      }
      status.textContent = 'Nearest AED found: ' + nearest.aed.name + ', ' +
        formatDistance(nearest.m) + ' away in a straight line.' +
        (coarse ? ' Your location is only accurate to about ' + formatDistance(c.accuracy) + '.' : '');

      var link = result.querySelector('.btn--maps');
      if (link) {
        link.addEventListener('click', cancelHandoff);
        link.focus({ preventScroll: true });
      }
      if (result.scrollIntoView) {
        result.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      }

      if (handoffNow) {
        handoffTimer = setTimeout(function () {
          handoffTimer = null;
          window.location.assign(directionsUrl(nearest.aed, mode));
        }, HANDOFF_DELAY_MS);
      }
    }

    button.addEventListener('click', function () {
      if (busy) { return; }
      reset();
      if (!AEDS.length) { return showError({ noData: true }); }
      if (!('geolocation' in navigator) || window.isSecureContext === false) {
        return showError({ unsupported: true });
      }
      setState('locating');
      setBusy(true);
      button.innerHTML = '<span class="btn__spinner" aria-hidden="true"></span>Finding your location…';
      status.textContent = 'Finding your location…';

      var mine = token = {};
      var watchdog = setTimeout(function () {
        if (token !== mine) { return; }
        showError({ code: 3 });
      }, WATCHDOG_MS);
      locate().then(function (position) {
        if (token !== mine) { return; }
        clearTimeout(watchdog);
        token = null;
        showResult(position);
      }, function (err) {
        if (token !== mine) { return; }
        clearTimeout(watchdog);
        showError(err);
      });
    });

    document.addEventListener('visibilitychange', function () { if (document.hidden) { cancelHandoff(); } });
    window.addEventListener('pagehide', cancelHandoff);

    setState('idle');
  }

  /* Directory of every AED, grouped by area, for the AED page. Needs no location. */
  function directoryHtml() {
    var groups = {};
    var order = [];
    AEDS.forEach(function (aed) {
      var g = aed.group || 'Other locations';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push(aed);
    });
    return order.map(function (g) {
      var rows = groups[g].slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      var items = rows.map(function (aed) {
        var url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(aed.lat + ',' + aed.lng);
        return '<li class="aed-directory__item">' +
          '<div>' +
            '<span class="aed-directory__name">' + esc(aed.name) + '</span>' +
            '<span class="aed-directory__note">' + esc(aed.area) + (aed.note ? ' · ' + esc(aed.note) : '') + unmanagedHtml(aed, 'span') + '</span>' +
          '</div>' +
          '<a href="' + esc(url) + '" target="_blank" rel="noopener">Directions<span class="visually-hidden"> to ' + esc(aed.name) + '</span></a>' +
        '</li>';
      }).join('');
      return '<section class="aed-directory__group">' +
        '<h3>' + esc(g) + ' <span class="aed-directory__count">' + rows.length + '</span></h3>' +
        '<ul class="aed-directory__list">' + items + '</ul>' +
      '</section>';
    }).join('');
  }

  function start() {
    var roots = document.querySelectorAll('[data-aed-finder]');
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
    /* AED totals in the page copy follow the data, so a new pin updates every count */
    var counts = document.querySelectorAll('[data-aed-count]');
    for (var ci = 0; ci < counts.length; ci++) { if (AEDS.length) { counts[ci].textContent = String(AEDS.length); } }
    var directory = document.querySelector('[data-aed-directory]');
    if (directory && AEDS.length) { directory.innerHTML = directoryHtml(); }
    var updated = document.querySelector('[data-aed-updated]');
    if (updated && window.DHS_AED_UPDATED) {
      var parts = String(window.DHS_AED_UPDATED).split('-');
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      updated.textContent = parts.length === 3
        ? parseInt(parts[2], 10) + ' ' + months[parseInt(parts[1], 10) - 1] + ' ' + parts[0]
        : window.DHS_AED_UPDATED;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
