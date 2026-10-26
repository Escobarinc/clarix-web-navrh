/* CLARIX — rozkreslení kruhových grafů
   Výseče se při první návštěvě sekce postupně vykreslí a číslo uprostřed
   naskáče od nuly. Kdo má v systému vypnuté animace, uvidí graf rovnou hotový. */
(function () {
  var KLID = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DOBA = 900, ODSTUP = 140;

  function pripravGraf(svg) {
    var vysece = Array.prototype.filter.call(svg.querySelectorAll('path'), function (p) {
      return p.getAttribute('stroke') && p.getAttribute('d');
    });
    if (!vysece.length) return null;
    var cislo = svg.querySelector('text[font-size="28"]') ||
                svg.querySelector('text[font-weight="700"]');
    var cil = cislo ? parseInt(cislo.textContent.replace(/\D/g, ''), 10) : null;
    var tvar = cislo ? cislo.textContent : '';

    vysece.forEach(function (p) {
      var d = p.getTotalLength();
      p.style.strokeDasharray = d + ' ' + d;
      p.style.strokeDashoffset = d;
    });
    if (cislo && cil) cislo.textContent = tvar.replace(String(cil), '0');

    return function spust() {
      vysece.forEach(function (p, i) {
        p.style.transition = 'stroke-dashoffset ' + DOBA + 'ms cubic-bezier(.22,.8,.3,1) ' + (i * ODSTUP) + 'ms';
        p.style.strokeDashoffset = '0';
      });
      if (cislo && cil) {
        var zacatek = null, delka = DOBA + (vysece.length - 1) * ODSTUP;
        var krok = function (t) {
          if (zacatek === null) zacatek = t;
          var p = Math.min(1, (t - zacatek) / delka);
          var h = Math.round(cil * (1 - Math.pow(1 - p, 3)));
          cislo.textContent = tvar.replace(String(cil), String(h));
          if (p < 1) requestAnimationFrame(krok);
        };
        requestAnimationFrame(krok);
      }
    };
  }

  function start() {
    var grafy = document.querySelectorAll('.pie-visual svg');
    if (!grafy.length) return;
    Array.prototype.forEach.call(grafy, function (svg) {
      var spust = pripravGraf(svg);
      if (!spust) return;
      if (KLID || !window.IntersectionObserver) { spust(); return; }
      var hlidac = new IntersectionObserver(function (zaznamy) {
        zaznamy.forEach(function (z) {
          if (z.isIntersecting) { hlidac.disconnect(); spust(); }
        });
      }, { threshold: 0.35 });
      hlidac.observe(svg);
    });
  }

  /* --- čárové a bodové grafy: čára se nakreslí zleva doprava, body naskáčou --- */
  function pripravCaru(svg) {
    var cary = Array.prototype.filter.call(svg.querySelectorAll('polyline,path,circle[stroke-dasharray]'), function (e) {
      var st = e.getAttribute('stroke'), fl = (e.getAttribute('fill') || '').toLowerCase();
      if (!st || st === 'none') return false;
      if (fl && fl !== 'none') return false;
      try { return e.getTotalLength() > 20; } catch (x) { return false; }
    });
    var body = Array.prototype.filter.call(svg.querySelectorAll('circle'), function (e) {
      return parseFloat(e.getAttribute('r') || 0) <= 10 && !e.getAttribute('stroke-dasharray');
    });
    if (!cary.length && !body.length) return null;

    cary.forEach(function (e) {
      var puvodni = e.getAttribute('stroke-dasharray');
      if (puvodni) {
        /* prstenec už má svůj tah - necháme ho a jen ho odkryjeme */
        var usek = parseFloat(puvodni.split(/[\s,]+/)[0]);
        if (!(usek > 0)) { usek = e.getTotalLength(); }
        e.__usek = usek;
        e.style.strokeDashoffset = usek;
      } else {
        var d = e.getTotalLength();
        e.style.strokeDasharray = d + ' ' + d;
        e.style.strokeDashoffset = d;
      }
    });
    body.forEach(function (e) {
      /* původní průhlednost z předlohy si pamatujeme, ať ji nepřepíšeme */
      e.__puvodni = e.getAttribute('opacity') || '1';
      e.style.opacity = '0';
    });

    return function spust() {
      cary.forEach(function (e, i) {
        e.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(.3,.7,.3,1) ' + (i * 180) + 'ms';
        e.style.strokeDashoffset = '0';
      });
      var zpozdeni = cary.length ? 420 : 0;
      body.forEach(function (e, i) {
        e.style.transition = 'opacity 320ms ease ' + (zpozdeni + i * 55) + 'ms';
        e.style.opacity = e.__puvodni || '1';
      });
    };
  }

  /* --- bublinové grafy: body naskáčou jeden po druhém --- */
  function pripravBubliny(svg) {
    var bubliny = Array.prototype.filter.call(svg.querySelectorAll('circle'), function (e) {
      var r = parseFloat(e.getAttribute('r') || 0);
      var v = (e.getAttribute('fill') || '').toLowerCase();
      return r > 10 && v && v !== 'none' && !e.getAttribute('stroke-dasharray');
    });
    if (bubliny.length < 3) return null;
    bubliny.forEach(function (e) {
      e.__puvodni = e.getAttribute('opacity') || '1';
      e.style.transformBox = 'fill-box';
      e.style.transformOrigin = 'center';
      e.style.transform = 'scale(.35)';
      e.style.opacity = '0';
    });
    return function spust() {
      bubliny.forEach(function (e, i) {
        e.style.transition = 'transform 620ms cubic-bezier(.34,1.46,.5,1) ' + (i * 110) + 'ms, opacity 380ms ease ' + (i * 110) + 'ms';
        e.style.transform = 'scale(1)';
        e.style.opacity = e.__puvodni || '1';
      });
      setTimeout(function () {
        bubliny.forEach(function (e) { e.style.transition = ''; e.style.transform = ''; });
      }, 1200 + bubliny.length * 110);
    };
  }

  /* --- grafy z vyplněných ploch (tokový graf, matice): setření zleva doprava --- */
  function pripravStery(svg) {
    var tvary = svg.querySelectorAll('path[fill]:not([fill="none"]),rect[fill]:not([fill="none"]),polygon');
    if (tvary.length < 3) return null;
    if (!('clipPath' in svg.style) && !('webkitClipPath' in svg.style)) return null;
    svg.style.clipPath = 'inset(0 100% 0 0)';
    return function spust() {
      svg.style.transition = 'clip-path 1200ms cubic-bezier(.33,.72,.26,1)';
      svg.style.clipPath = 'inset(0 0 0 0)';
      /* po doběhnutí ořez zrušíme, ať nic nepřekáží najetí myší */
      setTimeout(function () {
        svg.style.transition = ''; svg.style.clipPath = '';
      }, 1500);
    };
  }

  function hlidej(svg, spust) {
    if (KLID || !window.IntersectionObserver) { spust(); return; }
    /* Hlídáme obal, ne samotný graf: oříznutý graf má nulovou plochu,
       prohlížeč ho pak nikdy nenahlásí jako viditelný a animace by nenaběhla. */
    var cil = svg.parentElement || svg;
    var hotovo = false;
    var provest = function () { if (hotovo) return; hotovo = true; spust(); };
    var h = new IntersectionObserver(function (z) {
      z.forEach(function (x) { if (x.isIntersecting) { h.disconnect(); provest(); } });
    }, { threshold: 0.15 });
    h.observe(cil);
    /* pojistka: kdyby hlídání z jakéhokoli důvodu selhalo, graf se po chvíli
       ukáže sám - nikdy nesmí zůstat schovaný */
    setTimeout(function () {
      if (hotovo) return;
      var r = cil.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { h.disconnect(); provest(); }
    }, 2500);
    window.addEventListener('scroll', function kontrola() {
      if (hotovo) { window.removeEventListener('scroll', kontrola); return; }
      var r = cil.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) {
        window.removeEventListener('scroll', kontrola); h.disconnect(); provest();
      }
    }, { passive: true });
  }

  function startCary() {
    Array.prototype.forEach.call(document.querySelectorAll('svg[aria-label]'), function (svg) {
      if (svg.closest('.pie-visual')) return;
      if (svg.dataset.animovano === '1') return;

      function nastav() {
        var spust = pripravCaru(svg) || pripravBubliny(svg) || pripravStery(svg);
        if (!spust) return false;
        svg.dataset.animovano = '1';
        hlidej(svg, spust);
        return true;
      }
      if (nastav()) return;
      /* graf, který teprve dokresluje stránka (posuvník rozpočtu) */
      if (!window.MutationObserver) return;
      var mo = new MutationObserver(function () {
        if (svg.querySelector('polyline,path,circle')) { mo.disconnect(); nastav(); }
      });
      mo.observe(svg, { childList: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    });
  }

  /* --- pruhy v podílových grafech: vyjedou zleva na svou délku --- */
  function startPruhy() {
    var pruhy = document.querySelectorAll('i[style*="width"]');
    if (!pruhy.length) return;
    var skupiny = [];
    Array.prototype.forEach.call(pruhy, function (e) {
      var cil = e.style.width;
      if (!cil || cil === '0%' || e.dataset.pruh === '1') return;
      e.dataset.pruh = '1';
      e.style.width = '0%';
      var obal = e.closest('.portfolio-bars, .seg-zebricek') || e.parentElement.parentElement || e.parentElement;
      var sk = null;
      for (var i = 0; i < skupiny.length; i++) if (skupiny[i].obal === obal) sk = skupiny[i];
      if (!sk) { sk = { obal: obal, prvky: [] }; skupiny.push(sk); }
      sk.prvky.push({ e: e, cil: cil });
    });
    skupiny.forEach(function (sk) {
      var spust = function () {
        sk.prvky.forEach(function (p, i) {
          p.e.style.transition = 'width 950ms cubic-bezier(.25,.75,.3,1) ' + (i * 90) + 'ms';
          p.e.style.width = p.cil;
        });
      };
      if (KLID || !window.IntersectionObserver) { spust(); return; }
      var h = new IntersectionObserver(function (z) {
        z.forEach(function (x) { if (x.isIntersecting) { h.disconnect(); spust(); } });
      }, { threshold: 0.25 });
      h.observe(sk.obal);
    });
  }

  /* --- sloupce v trychtýři: vyrostou zdola --- */
  function startSloupce() {
    var sloupce = document.querySelectorAll('.s5-bar[style*="--mobile"], .s5-bar[style*="--desktop"]');
    if (!sloupce.length) return;
    var obal = document.querySelector('.s5-funnel') || sloupce[0].parentElement;
    var seznam = [];
    Array.prototype.forEach.call(sloupce, function (e) {
      var nazev = e.style.getPropertyValue('--mobile') ? '--mobile' : '--desktop';
      var cil = e.style.getPropertyValue(nazev).trim();
      if (!cil || e.dataset.sloupec === '1') return;
      e.dataset.sloupec = '1';
      var vypln = e.querySelector('i');
      if (vypln) vypln.style.transition = 'none';
      e.style.setProperty(nazev, '0');
      seznam.push({ e: e, nazev: nazev, cil: cil, vypln: vypln });
    });
    if (!seznam.length) return;
    var spust = function () {
      seznam.forEach(function (p, i) {
        if (p.vypln) p.vypln.style.transition = 'height 820ms cubic-bezier(.25,.8,.3,1) ' + (Math.floor(i / 2) * 120) + 'ms';
        p.e.style.setProperty(p.nazev, p.cil);
      });
    };
    if (KLID || !window.IntersectionObserver) { spust(); return; }
    var h = new IntersectionObserver(function (z) {
      z.forEach(function (x) { if (x.isIntersecting) { h.disconnect(); spust(); } });
    }, { threshold: 0.2 });
    h.observe(obal);
  }

  /* --- žebříček segmentů: řádky naskáčou shora dolů --- */
  function startZebricek() {
    Array.prototype.forEach.call(document.querySelectorAll('.seg-zebricek'), function (z) {
      if (KLID || z.dataset.zebricek === '1') return;
      z.dataset.zebricek = '1';
      var radky = z.querySelectorAll('.seg-radek');
      Array.prototype.forEach.call(radky, function (r) {
        r.style.opacity = '0';
        r.style.transform = 'translateY(10px)';
      });
      var hotovo = false;
      var spust = function () {
        if (hotovo) return; hotovo = true;
        Array.prototype.forEach.call(radky, function (r, i) {
          r.style.transition = 'opacity 420ms ease ' + (i * 110) + 'ms, transform 520ms cubic-bezier(.25,.8,.3,1) ' + (i * 110) + 'ms';
          r.style.opacity = '1';
          r.style.transform = 'none';
        });
      };
      if (!window.IntersectionObserver) { spust(); return; }
      var h = new IntersectionObserver(function (x) {
        x.forEach(function (y) { if (y.isIntersecting) { h.disconnect(); spust(); } });
      }, { threshold: 0.15 });
      h.observe(z);
      /* pojistka - řádky nesmí zůstat schované */
      setTimeout(function () {
        var b = z.getBoundingClientRect();
        if (!hotovo && b.top < window.innerHeight && b.bottom > 0) { h.disconnect(); spust(); }
      }, 2500);
    });
  }

  /* --- čísla v kartách: naběhnou od nuly a zastaví se přesně na hodnotě --- */
  function startCitace() {
    if (KLID) return;
    var prvky = document.querySelectorAll('.v4-econ-stage > b, .v4-kpi > strong');
    if (!prvky.length) return;
    var skupiny = [];
    Array.prototype.forEach.call(prvky, function (e) {
      if (e.dataset.citac === '1') return;
      var puvodni = e.textContent;
      /* předpona (≈), číslo s mezerami po tisících, případně desetinná čárka, přípona (Kč, %) */
      var m = puvodni.match(/^(\D*?)(\d[\d \u00a0\u202f]*\d|\d)(?:,(\d+))?(.*)$/);
      if (!m) return;
      var cil = parseInt(m[2].replace(/\D/g, ''), 10);
      if (!(cil > 0)) return;
      var odd = (m[2].match(/[ \u00a0\u202f]/) || [' '])[0];
      e.dataset.citac = '1';
      var obal = e.closest('.v4-econ-stages, .v4-kpi-row') || e.parentElement;
      var sk = null;
      for (var i = 0; i < skupiny.length; i++) if (skupiny[i].obal === obal) sk = skupiny[i];
      if (!sk) { sk = { obal: obal, prvky: [] }; skupiny.push(sk); }
      sk.prvky.push({ e: e, puvodni: puvodni, pred: m[1], cil: cil, odd: odd, za: m[4] || '' });
      e.textContent = m[1] + '0' + (m[4] || '');
    });
    var formatuj = function (n, odd) {
      var t = String(n), v = '';
      while (t.length > 3) { v = odd + t.slice(-3) + v; t = t.slice(0, -3); }
      return t + v;
    };
    skupiny.forEach(function (sk) {
      var hotovo = false;
      var spust = function () {
        if (hotovo) return; hotovo = true;
        sk.prvky.forEach(function (p, i) {
          p.e.style.fontVariantNumeric = 'tabular-nums';
          var zacatek = null, delka = 1300, zpozdeni = i * 120;
          var krok = function (t) {
            if (zacatek === null) zacatek = t + zpozdeni;
            var x = Math.max(0, Math.min(1, (t - zacatek) / delka));
            var h = Math.round(p.cil * (1 - Math.pow(1 - x, 3)));
            p.e.textContent = p.pred + formatuj(h, p.odd) + p.za;
            if (x < 1) requestAnimationFrame(krok);
            else { p.e.textContent = p.puvodni; p.e.style.fontVariantNumeric = ''; }
          };
          requestAnimationFrame(krok);
        });
      };
      /* stejné pojistky jako u grafů - číslo nikdy nesmí zůstat na nule */
      if (window.IntersectionObserver) {
        var h = new IntersectionObserver(function (z) {
          z.forEach(function (x) { if (x.isIntersecting) { h.disconnect(); spust(); } });
        }, { threshold: 0.2 });
        h.observe(sk.obal);
      } else { spust(); }
      setTimeout(function () {
        var r = sk.obal.getBoundingClientRect();
        if (!hotovo && r.top < window.innerHeight && r.bottom > 0) spust();
      }, 2500);
      window.addEventListener('scroll', function kontrola() {
        if (hotovo) { window.removeEventListener('scroll', kontrola); return; }
        var r = sk.obal.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9 && r.bottom > 0) { window.removeEventListener('scroll', kontrola); spust(); }
      }, { passive: true });
    });
  }

  function vse() { start(); startCary(); startPruhy(); startSloupce(); startZebricek(); startCitace(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vse);
  else vse();
})();
