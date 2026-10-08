/* Dingle Heart Safe: Instagram feed
 *
 * Renders posts from window.DHS_INSTAGRAM (instagram-data.js) into every
 * [data-insta-feed] element:
 *   data-layout="tiles"   square grid, each tile opens the post on Instagram
 *   data-layout="cards"   full posts with captions, photos and video
 *   data-limit="N"        number of posts to show
 *   data-feature-first    show the newest post as a large featured card
 * [data-insta-updated] elements get the date of the newest post.
 *
 * When DHS_INSTAGRAM.feedUrl holds a Behold JSON feed address, the latest
 * posts are fetched live and replace the snapshot. If that fails, the
 * snapshot stays on screen.
 */
(function () {
  'use strict';

  var DATA = window.DHS_INSTAGRAM || { posts: [] };
  var PROFILE = DATA.profileUrl || 'https://www.instagram.com/dingleheartsafe/';
  var HANDLE = '@' + (DATA.username || 'dingleheartsafe');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>';
  var ICON_STACK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7 3h11a3 3 0 0 1 3 3v11h-2V6a1 1 0 0 0-1-1H7z"/><rect x="3" y="7" width="14" height="14" rx="2.5" fill="currentColor"/></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toDate(ts) {
    if (!ts) { return null; }
    var d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(ts) ? ts + 'T12:00:00' : ts);
    return isNaN(d.getTime()) ? null : d;
  }

  function longDate(ts) {
    var d = toDate(ts);
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '';
  }

  function shortDate(ts) {
    var d = toDate(ts);
    return d ? d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : '';
  }

  function isoDate(ts) {
    var d = toDate(ts);
    if (!d) { return ''; }
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /* Escape, then turn @mentions and #hashtags into Instagram links and keep line breaks. */
  function captionHtml(text) {
    return esc(text)
      .replace(/(^|[\s(])@([A-Za-z0-9._]{1,30})/g, function (all, pre, name) {
        var clean = name.replace(/\.+$/, '');
        return pre + '<a href="https://www.instagram.com/' + clean + '/" target="_blank" rel="noopener">@' + clean + '</a>' + name.slice(clean.length);
      })
      .replace(/(^|\s)#([A-Za-z0-9_À-ɏ]+)/g, function (all, pre, tag) {
        return pre + '<a href="https://www.instagram.com/explore/tags/' + encodeURIComponent(tag) + '/" target="_blank" rel="noopener">#' + tag + '</a>';
      })
      .replace(/\n/g, '<br>');
  }

  function excerpt(text, max) {
    var plain = String(text || '').replace(/\s+/g, ' ').trim();
    if (plain.length <= max) { return plain; }
    var cut = plain.slice(0, max);
    var space = cut.lastIndexOf(' ');
    return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,.;:!\s]+$/, '') + '…';
  }

  function sortPosts(list) {
    return (list || []).slice().sort(function (a, b) {
      var da = toDate(a.timestamp), db = toDate(b.timestamp);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });
  }

  /* Convert a Behold JSON feed (object with posts, or a plain array) to the snapshot format. */
  function fromBehold(json) {
    var list = Array.isArray(json) ? json : (json && json.posts) || [];
    return list.map(function (p) {
      var items = (p.mediaType === 'CAROUSEL_ALBUM' && p.children && p.children.length) ? p.children : [p];
      var media = items.map(function (m) {
        var s = m.sizes || {};
        var medium = s.medium || s.large || s.full || {};
        var large = s.large || s.full || medium;
        if (m.mediaType === 'VIDEO' && m.mediaUrl) {
          return { type: 'VIDEO', src: m.mediaUrl, poster: large.mediaUrl || m.thumbnailUrl || p.thumbnailUrl,
                   width: large.width, height: large.height, alt: m.altText || '' };
        }
        /* Images, and videos Instagram will not share (no mediaUrl): show the still and link to the post */
        return { type: 'IMAGE', src: medium.mediaUrl || m.mediaUrl || m.thumbnailUrl || p.thumbnailUrl,
                 srcLarge: large.mediaUrl || m.mediaUrl || m.thumbnailUrl || p.thumbnailUrl,
                 width: large.width, height: large.height, alt: m.altText || '' };
      }).filter(function (m) { return m.src || m.poster; });
      return { id: p.id, permalink: p.permalink, timestamp: p.timestamp, type: p.mediaType,
               caption: p.prunedCaption || p.caption || '', media: media };
    }).filter(function (p) { return p.media.length && p.permalink; });
  }

  function altFor(item, post) {
    return item.alt || ('Instagram post from ' + longDate(post.timestamp));
  }

  function thumbOf(post) {
    var first = post.media[0];
    return first.type === 'VIDEO' ? (first.poster || '') : (first.src || '');
  }

  function dims(item) {
    return (item.width && item.height) ? ' width="' + esc(item.width) + '" height="' + esc(item.height) + '"' : '';
  }

  /* ---------- Tiles: square grid for the home page ---------- */
  function tilesHtml(posts) {
    return '<ul class="insta-tiles">' + posts.map(function (post) {
      var badge = post.type === 'CAROUSEL_ALBUM' ? ICON_STACK : (post.media[0].type === 'VIDEO' ? ICON_PLAY : '');
      return '<li><a class="insta-tile" href="' + esc(post.permalink) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(thumbOf(post)) + '" alt="' + esc(altFor(post.media[0], post)) + '" loading="lazy" decoding="async"' + dims(post.media[0]) + '>' +
        (badge ? '<span class="insta-tile__type">' + badge + '</span>' : '') +
        '<span class="insta-tile__overlay">' +
          '<time class="insta-tile__date" datetime="' + esc(isoDate(post.timestamp)) + '">' + esc(shortDate(post.timestamp)) + '</time>' +
          '<span class="insta-tile__text">' + esc(excerpt(post.caption, 110)) + '</span>' +
        '</span>' +
        '<span class="visually-hidden"> (opens the post on Instagram)</span>' +
      '</a></li>';
    }).join('') + '</ul>';
  }

  /* ---------- Cards: full posts for the news page ---------- */
  function slideHtml(item, post, index, total) {
    var label = total > 1 ? ' (' + (index + 1) + ' of ' + total + ')' : '';
    if (item.type === 'VIDEO') {
      return '<div class="post__slide post__slide--video"' + (index ? ' hidden' : '') + ' data-video-src="' + esc(item.src) + '">' +
        '<img src="' + esc(item.poster || '') + '" alt="' + esc(altFor(item, post)) + '" loading="lazy" decoding="async"' + dims(item) + '>' +
        '<button class="post__play" type="button">' + ICON_PLAY + '<span class="visually-hidden">Play video' + esc(label) + '</span></button>' +
      '</div>';
    }
    var srcset = item.srcLarge && item.srcLarge !== item.src
      ? ' srcset="' + esc(item.src) + ' 800w, ' + esc(item.srcLarge) + ' 1600w" sizes="(min-width: 900px) 40vw, 100vw"' : '';
    return '<div class="post__slide"' + (index ? ' hidden' : '') + '>' +
      '<img src="' + esc(item.src) + '"' + srcset + ' alt="' + esc(altFor(item, post) + label) + '" loading="lazy" decoding="async"' + dims(item) + '>' +
    '</div>';
  }

  function cardHtml(post, featured, n) {
    var total = post.media.length;
    var capId = 'insta-cap-' + n;
    var nav = total > 1
      ? '<button class="post__nav post__nav--prev" type="button" data-step="-1">' + ICON_PREV + '<span class="visually-hidden">Previous</span></button>' +
        '<button class="post__nav post__nav--next" type="button" data-step="1">' + ICON_NEXT + '<span class="visually-hidden">Next</span></button>' +
        '<span class="post__count" aria-live="polite"><span data-current>1</span> / ' + total + '</span>'
      : '';
    return '<article class="post' + (featured ? ' post--featured' : '') + '">' +
      '<div class="post__media' + (post.media[0].width > post.media[0].height ? ' post__media--wide' : '') + '" data-index="0" data-total="' + total + '">' +
        post.media.map(function (m, i) { return slideHtml(m, post, i, total); }).join('') + nav +
      '</div>' +
      '<div class="post__body">' +
        '<p class="post__meta">' +
          '<a class="post__handle" href="' + esc(PROFILE) + '" target="_blank" rel="noopener"><span class="ig-badge ig-badge--sm">' + ICON_IG + '</span>' + esc(HANDLE) + '</a>' +
          '<time datetime="' + esc(isoDate(post.timestamp)) + '">' + esc(longDate(post.timestamp)) + '</time>' +
        '</p>' +
        '<div class="post__caption" id="' + capId + '">' + captionHtml(post.caption) + '</div>' +
        '<button class="post__more" type="button" aria-expanded="false" aria-controls="' + capId + '" hidden>Read more</button>' +
        '<a class="post__link" href="' + esc(post.permalink) + '" target="_blank" rel="noopener">View on Instagram<span class="visually-hidden"> (post from ' + esc(longDate(post.timestamp)) + ')</span></a>' +
      '</div>' +
    '</article>';
  }

  function cardsHtml(posts, featureFirst) {
    return '<div class="posts">' + posts.map(function (post, i) {
      return cardHtml(post, featureFirst && i === 0, i);
    }).join('') + '</div>';
  }

  function show(media, index) {
    var slides = media.querySelectorAll('.post__slide');
    var total = slides.length;
    index = (index + total) % total;
    for (var i = 0; i < total; i++) {
      slides[i].hidden = i !== index;
      if (i !== index) {
        var v = slides[i].querySelector('video');
        if (v) { v.pause(); }
      }
    }
    media.setAttribute('data-index', String(index));
    var counter = media.querySelector('[data-current]');
    if (counter) { counter.textContent = String(index + 1); }
  }

  function wireCards(root) {
    root.addEventListener('click', function (e) {
      var target = e.target.closest ? e.target : null;
      if (!target) { return; }

      var nav = target.closest('.post__nav');
      if (nav) {
        var media = nav.closest('.post__media');
        show(media, parseInt(media.getAttribute('data-index'), 10) + parseInt(nav.getAttribute('data-step'), 10));
        return;
      }

      var play = target.closest('.post__play');
      if (play) {
        var slide = play.closest('.post__slide');
        var video = document.createElement('video');
        video.src = slide.getAttribute('data-video-src');
        var poster = slide.querySelector('img');
        if (poster) { video.poster = poster.getAttribute('src'); video.setAttribute('aria-label', poster.getAttribute('alt') || 'Video'); }
        video.controls = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        slide.innerHTML = '';
        slide.appendChild(video);
        var p = video.play();
        if (p && p.catch) { p.catch(function () {}); }
        video.focus();
        return;
      }

      var more = target.closest('.post__more');
      if (more) {
        var cap = document.getElementById(more.getAttribute('aria-controls'));
        var open = more.getAttribute('aria-expanded') !== 'true';
        cap.classList.toggle('is-expanded', open);
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = open ? 'Show less' : 'Read more';
        if (open) {
          var hiddenLinks = cap.querySelectorAll('a[tabindex]');
          for (var q = 0; q < hiddenLinks.length; q++) { hiddenLinks[q].removeAttribute('tabindex'); }
        } else {
          cap.scrollTop = 0;
          checkCaptions(root);
        }
      }
    });

    /* Swipe between photos on touch screens: a clearly sideways swipe only, never on a video's controls */
    var startX = null, startY = null;
    root.addEventListener('touchstart', function (e) {
      startX = null;
      if (!e.target.closest || e.touches.length !== 1) { return; }
      if (e.target.closest('video') || !e.target.closest('.post__media[data-total]')) { return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener('touchcancel', function () { startX = null; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (startX === null) { return; }
      var media = e.target.closest ? e.target.closest('.post__media') : null;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (media && parseInt(media.getAttribute('data-total'), 10) > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        show(media, parseInt(media.getAttribute('data-index'), 10) + (dx < 0 ? 1 : -1));
      }
    });
  }

  /* Show "Read more" only where the caption is actually cut off. */
  function checkCaptions(root) {
    var caps = root.querySelectorAll('.post__caption');
    for (var i = 0; i < caps.length; i++) {
      var more = root.querySelector('[aria-controls="' + caps[i].id + '"]');
      if (!more || caps[i].classList.contains('is-expanded')) { continue; }
      more.hidden = caps[i].scrollHeight <= caps[i].clientHeight + 2;
      var capBottom = caps[i].getBoundingClientRect().bottom;
      var links = caps[i].querySelectorAll('a');
      for (var k = 0; k < links.length; k++) {
        if (links[k].getBoundingClientRect().bottom > capBottom + 1) { links[k].setAttribute('tabindex', '-1'); }
        else { links[k].removeAttribute('tabindex'); }
      }
    }
  }

  function render(root, posts) {
    var layout = root.getAttribute('data-layout') || 'cards';
    var limit = parseInt(root.getAttribute('data-limit'), 10) || posts.length;
    var list = posts.slice(0, limit);
    if (!list.length) {
      root.innerHTML = '<p class="insta-empty">No posts to show yet. <a href="' + esc(PROFILE) + '" target="_blank" rel="noopener">See our Instagram</a>.</p>';
      return;
    }
    if (layout === 'tiles') {
      root.innerHTML = tilesHtml(list);
    } else {
      root.innerHTML = cardsHtml(list, root.hasAttribute('data-feature-first'));
      if (!root.hasAttribute('data-wired')) { wireCards(root); root.setAttribute('data-wired', ''); }
      if (window.requestAnimationFrame) { window.requestAnimationFrame(function () { checkCaptions(root); }); }
      else { checkCaptions(root); }
    }
  }

  function stampUpdated(posts) {
    var els = document.querySelectorAll('[data-insta-updated]');
    if (!els.length || !posts.length) { return; }
    for (var i = 0; i < els.length; i++) { els[i].textContent = longDate(posts[0].timestamp); }
  }

  function start() {
    var roots = document.querySelectorAll('[data-insta-feed]');
    var snapshot = sortPosts(DATA.posts);
    for (var i = 0; i < roots.length; i++) { render(roots[i], snapshot); }
    stampUpdated(snapshot);

    if (DATA.feedUrl && window.fetch && roots.length) {
      window.fetch(DATA.feedUrl, { credentials: 'omit' })
        .then(function (r) { if (!r.ok) { throw new Error('Feed returned ' + r.status); } return r.json(); })
        .then(function (json) {
          var live = sortPosts(fromBehold(json));
          if (!live.length) { return; }
          for (var j = 0; j < roots.length; j++) { render(roots[j], live); }
          stampUpdated(live);
        })
        .catch(function () { /* keep the snapshot */ });
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        for (var k = 0; k < roots.length; k++) {
          if (roots[k].getAttribute('data-layout') !== 'tiles') { checkCaptions(roots[k]); }
        }
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
