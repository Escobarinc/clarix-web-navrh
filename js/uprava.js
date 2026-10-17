/* CLARIX — režim úprav.
   Zapne se tím, že se k adrese stránky přidá ?uprava=1
   Běžný návštěvník webu o něm nikdy neví. */
(function () {
  'use strict';

  var KLIC_TEXTY = 'clarix-upravy-texty';
  var KLIC_POZN  = 'clarix-upravy-poznamky';
  var STRANKA = (location.pathname.split('/').pop() || 'index.html');

  /* jaky rezim? uprava = psani, nahled = jen koukani na odeslane upravy */
  if (/[?&]uprava=0/.test(location.search) || /[?&]nahled=0/.test(location.search)) {
    sessionStorage.removeItem('clarix-uprava'); sessionStorage.removeItem('clarix-nahled');
    return;
  }
  if (/[?&]uprava=1/.test(location.search)) { sessionStorage.setItem('clarix-uprava', '1'); sessionStorage.removeItem('clarix-nahled'); }
  if (/[?&]nahled=1/.test(location.search)) { sessionStorage.setItem('clarix-nahled', '1'); sessionStorage.removeItem('clarix-uprava'); }
  var REZIM = sessionStorage.getItem('clarix-uprava') === '1' ? 'uprava'
            : sessionStorage.getItem('clarix-nahled') === '1' ? 'nahled' : null;
  if (!REZIM) return;

  /* ---------- pomocné ---------- */
  function nacti(klic) { try { return JSON.parse(localStorage.getItem(klic) || '{}'); } catch (e) { return {}; } }
  function uloz(klic, data) { try { localStorage.setItem(klic, JSON.stringify(data)); } catch (e) {} }

  /* stabilní adresa prvku ve stránce */
  function cesta(el) {
    var kusy = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      var rodic = el.parentNode;
      if (!rodic) break;
      var stejne = [], d = rodic.children;
      for (var i = 0; i < d.length; i++) if (d[i].tagName === el.tagName) stejne.push(d[i]);
      kusy.unshift(el.tagName.toLowerCase() + (stejne.length > 1 ? ':' + stejne.indexOf(el) : ''));
      el = rodic;
    }
    return kusy.join('>');
  }
  function podleCesty(c) {
    var el = document.body;
    var kusy = c.split('>');
    for (var i = 0; i < kusy.length && el; i++) {
      var k = kusy[i].split(':'), znacka = k[0].toUpperCase(), poradi = k.length > 1 ? +k[1] : 0;
      var nalez = [], d = el.children;
      for (var j = 0; j < d.length; j++) if (d[j].tagName === znacka) nalez.push(d[j]);
      el = nalez[poradi];
    }
    return el || null;
  }

  /* které prvky jdou upravovat */
  var ZNACKY = 'h1,h2,h3,h4,p,li,blockquote,figcaption,td,th,summary,button,a,span,b,strong,em,div';
  function jdeUpravit(el) {
    if (el.closest('.up-lista,.up-poznamka,#hero3d,script,style,svg')) return false;
    if (el.querySelector('svg,img,i[data-lucide],input,textarea,select')) return false;
    var text = (el.textContent || '').trim();
    if (!text || text.length > 2000) return false;
    /* jen prvky, které obsahují text a žádné další upravitelné děti */
    for (var i = 0; i < el.children.length; i++) {
      if ((el.children[i].textContent || '').trim()) return false;
    }
    return true;
  }

  /* ---------- obnovení uložených úprav ---------- */
  function obnovTexty() {
    var vse = nacti(KLIC_TEXTY)[STRANKA] || {};
    Object.keys(vse).forEach(function (c) {
      var el = podleCesty(c);
      if (el) el.textContent = vse[c].novy;
    });
  }

  /* ---------- úprava textů ---------- */
  var textyZap = false;
  function prepniTexty(stav) {
    textyZap = stav;
    var prvky = document.querySelectorAll(ZNACKY);
    for (var i = 0; i < prvky.length; i++) {
      var el = prvky[i];
      if (!jdeUpravit(el)) continue;
      if (stav) {
        if (!el.hasAttribute('data-up-puvodni')) el.setAttribute('data-up-puvodni', el.textContent);
        el.setAttribute('contenteditable', 'true');
        el.classList.add('up-editovatelne');
        el.addEventListener('blur', zapisZmenu);
        el.addEventListener('keydown', hlidejEnter);
        if (el.tagName === 'A') el.addEventListener('click', zablokujOdkaz);
      } else {
        el.removeAttribute('contenteditable');
        el.classList.remove('up-editovatelne');
        el.removeEventListener('blur', zapisZmenu);
        el.removeEventListener('keydown', hlidejEnter);
        if (el.tagName === 'A') el.removeEventListener('click', zablokujOdkaz);
      }
    }
    document.body.classList.toggle('up-rezim-texty', stav);
  }
  function zablokujOdkaz(e) { if (textyZap) e.preventDefault(); }
  function hlidejEnter(e) { if (e.key === 'Enter' && this.tagName !== 'LI') { e.preventDefault(); this.blur(); } }

  function zapisZmenu() {
    var puvodni = this.getAttribute('data-up-puvodni') || '';
    var novy = this.textContent.replace(/\s+/g, ' ').trim();
    var vse = nacti(KLIC_TEXTY);
    vse[STRANKA] = vse[STRANKA] || {};
    var c = cesta(this);
    if (novy === puvodni.replace(/\s+/g, ' ').trim()) { delete vse[STRANKA][c]; this.classList.remove('up-zmeneno'); }
    else { vse[STRANKA][c] = { puvodni: puvodni, novy: novy }; this.classList.add('up-zmeneno'); }
    uloz(KLIC_TEXTY, vse);
    spocitej();
  }

  /* ---------- žluté poznámky ---------- */
  var pridavamPoznamku = false;
  function prepniPridavani(stav) {
    pridavamPoznamku = stav;
    document.body.classList.toggle('up-pridavam', stav);
  }
  document.addEventListener('click', function (e) {
    if (!pridavamPoznamku) return;
    if (e.target.closest('.up-lista,.up-poznamka')) return;
    e.preventDefault(); e.stopPropagation();
    var sekce = e.target.closest('section,header,footer,main') || document.body;
    var r = sekce.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    var id = 'p' + Date.now();
    var vse = nacti(KLIC_POZN);
    vse[STRANKA] = vse[STRANKA] || {};
    vse[STRANKA][id] = { kotva: cesta(sekce), x: x, y: y, text: '' };
    uloz(KLIC_POZN, vse);
    vykresliPoznamku(id, vse[STRANKA][id], true);
    prepniPridavani(false);
    spocitej();
  }, true);

  function vykresliPoznamku(id, p, hnedPsat, jenCist) {
    var kotva = podleCesty(p.kotva) || document.body;
    if (getComputedStyle(kotva).position === 'static') kotva.style.position = 'relative';
    var box = document.createElement('div');
    box.className = 'up-poznamka';
    box.dataset.id = id;
    box.style.left = p.x + '%';
    box.style.top = p.y + '%';
    box.innerHTML = '<div class="up-pozn-hlava"><span>Poznámka</span><button type="button" class="up-pozn-smaz" title="Smazat">×</button></div>' +
                    '<textarea placeholder="Co tady chcete změnit?"></textarea>';
    var ta = box.querySelector('textarea');
    ta.value = p.text || '';
    if (jenCist) {
      ta.readOnly = true;
      box.querySelector('.up-pozn-smaz').remove();
      kotva.appendChild(box);
      return;
    }
    ta.addEventListener('input', function () {
      var vse = nacti(KLIC_POZN);
      if (vse[STRANKA] && vse[STRANKA][id]) { vse[STRANKA][id].text = ta.value; uloz(KLIC_POZN, vse); }
    });
    box.querySelector('.up-pozn-smaz').addEventListener('click', function () {
      var vse = nacti(KLIC_POZN);
      if (vse[STRANKA]) { delete vse[STRANKA][id]; uloz(KLIC_POZN, vse); }
      box.remove(); spocitej();
    });
    /* tažení za hlavičku */
    var hlava = box.querySelector('.up-pozn-hlava'), taham = false, dx = 0, dy = 0;
    hlava.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('up-pozn-smaz')) return;
      taham = true; var r = box.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top; e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!taham) return;
      var r = kotva.getBoundingClientRect();
      var nx = ((e.clientX - dx - r.left) / r.width) * 100, ny = ((e.clientY - dy - r.top) / r.height) * 100;
      box.style.left = nx + '%'; box.style.top = ny + '%';
      var vse = nacti(KLIC_POZN);
      if (vse[STRANKA] && vse[STRANKA][id]) { vse[STRANKA][id].x = nx; vse[STRANKA][id].y = ny; uloz(KLIC_POZN, vse); }
    });
    document.addEventListener('mouseup', function () { taham = false; });
    kotva.appendChild(box);
    if (hnedPsat) ta.focus();
  }

  function obnovPoznamky() {
    var vse = nacti(KLIC_POZN)[STRANKA] || {};
    Object.keys(vse).forEach(function (id) { vykresliPoznamku(id, vse[id], false); });
  }

  /* ---------- odesílání ---------- */
  function sbaleno() {
    return { stranka: STRANKA, cas: new Date().toISOString(),
             texty: nacti(KLIC_TEXTY), poznamky: nacti(KLIC_POZN) };
  }
  function spocitej() {
    var t = nacti(KLIC_TEXTY), p = nacti(KLIC_POZN), pt = 0, pp = 0;
    Object.keys(t).forEach(function (s) { pt += Object.keys(t[s]).length; });
    Object.keys(p).forEach(function (s) { pp += Object.keys(p[s]).length; });
    var el = document.querySelector('.up-pocet');
    if (el) el.textContent = pt + ' úprav · ' + pp + ' poznámek';
    return { texty: pt, poznamky: pp };
  }

  function odesli() {
    var tlacitko = document.querySelector('.up-odeslat');
    var data = sbaleno();
    if (!window.CLARIX_DB) { stahni(); return; }
    var kdo = localStorage.getItem('clarix-kdo');
    if (!kdo) {
      kdo = (window.prompt('Jak se podepíšete? (stačí jméno)') || '').trim();
      if (kdo) localStorage.setItem('clarix-kdo', kdo);
    }
    tlacitko.disabled = true; tlacitko.textContent = 'Odesílám…';
    fetch(window.CLARIX_DB, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        stranka: { stringValue: data.stranka },
        cas: { stringValue: data.cas },
        kdo: { stringValue: localStorage.getItem('clarix-kdo') || '' },
        obsah: { stringValue: JSON.stringify({ texty: data.texty, poznamky: data.poznamky }) }
      } })
    }).then(function (r) {
      tlacitko.disabled = false;
      if (r.ok) { tlacitko.textContent = 'Odesláno ✓'; setTimeout(function () { tlacitko.textContent = 'Odeslat úpravy'; }, 2500); }
      else { tlacitko.textContent = 'Nepovedlo se — stahuji soubor'; stahni(); }
    }).catch(function () { tlacitko.disabled = false; tlacitko.textContent = 'Bez internetu — stahuji soubor'; stahni(); });
  }

  function stahni() {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(sbaleno(), null, 2)], { type: 'application/json' }));
    a.download = 'clarix-upravy-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
    a.click();
  }

  /* ---------- lišta ---------- */
  function postavListu() {
    var l = document.createElement('div');
    l.className = 'up-lista';
    l.innerHTML =
      '<span class="up-znak">Režim úprav</span>' +
      '<button type="button" class="up-btn up-texty">Upravit texty</button>' +
      '<button type="button" class="up-btn up-pozn">Přidat poznámku</button>' +
      '<span class="up-pocet"></span>' +
      '<button type="button" class="up-btn up-odeslat up-hlavni">Odeslat úpravy</button>' +
      '<button type="button" class="up-btn up-stahnout" title="Uložit do souboru">Stáhnout</button>' +
      '<button type="button" class="up-btn up-konec" title="Vypnout režim úprav">Konec</button>';
    document.body.appendChild(l);
    l.querySelector('.up-texty').addEventListener('click', function () {
      prepniTexty(!textyZap);
      this.classList.toggle('up-aktivni', textyZap);
      this.textContent = textyZap ? 'Texty: zapnuto' : 'Upravit texty';
    });
    l.querySelector('.up-pozn').addEventListener('click', function () {
      prepniPridavani(!pridavamPoznamku);
      this.classList.toggle('up-aktivni', pridavamPoznamku);
      this.textContent = pridavamPoznamku ? 'Klikněte na stránku…' : 'Přidat poznámku';
    });
    l.querySelector('.up-odeslat').addEventListener('click', odesli);
    l.querySelector('.up-stahnout').addEventListener('click', stahni);
    l.querySelector('.up-konec').addEventListener('click', function () {
      sessionStorage.removeItem('clarix-uprava');
      location.href = location.pathname;
    });
    spocitej();
  }

  /* režim úprav se drží i při přechodu na jinou stránku */
  function podrzOdkazy() {
    var o = document.querySelectorAll('a[href]');
    for (var i = 0; i < o.length; i++) {
      var h = o[i].getAttribute('href');
      if (!h || /^(#|mailto:|tel:|http)/.test(h)) continue;
      var par = REZIM === 'nahled' ? 'nahled=1' : 'uprava=1';
      if (h.indexOf(par) === -1) o[i].setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + par);
    }
  }

  /* ================= NÁHLED odeslaných úprav ================= */
  var DAVKY = [];

  function postavListuNahledu() {
    var l = document.createElement('div');
    l.className = 'up-lista';
    l.innerHTML =
      '<span class="up-znak up-znak-nahled">Náhled úprav</span>' +
      '<select class="up-vyber"></select>' +
      '<button type="button" class="up-btn up-zvyrazni up-aktivni">Zvýraznit změny</button>' +
      '<span class="up-pocet"></span>' +
      '<button type="button" class="up-btn up-konec">Zpět na původní web</button>';
    document.body.appendChild(l);
    l.querySelector('.up-zvyrazni').addEventListener('click', function () {
      var zap = document.body.classList.toggle('up-bez-zvyrazneni');
      this.classList.toggle('up-aktivni', !zap);
    });
    l.querySelector('.up-konec').addEventListener('click', function () {
      sessionStorage.removeItem('clarix-nahled');
      location.href = location.pathname;
    });
    l.querySelector('.up-vyber').addEventListener('change', function () {
      sessionStorage.setItem('clarix-davka', this.value);
      location.reload();
    });
    return l;
  }

  function naplnVyber(l) {
    var sel = l.querySelector('.up-vyber');
    var vybrano = sessionStorage.getItem('clarix-davka') || 'vse';
    var html = '<option value="vse">Všechna odeslání dohromady</option>';
    DAVKY.forEach(function (d, i) {
      var c = d.cas ? new Date(d.cas).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '?';
      html += '<option value="' + i + '"' + (String(i) === vybrano ? ' selected' : '') + '>' + (d.kdo || 'bez podpisu') + ' · ' + c + '</option>';
    });
    sel.innerHTML = html;
    if (vybrano === 'vse') sel.value = 'vse';
  }

  function nasadNahled(l) {
    var vybrano = sessionStorage.getItem('clarix-davka') || 'vse';
    var pouzit = vybrano === 'vse' ? DAVKY : [DAVKY[+vybrano]].filter(Boolean);
    var pt = 0, pp = 0;
    pouzit.forEach(function (d) {
      var t = (d.texty || {})[STRANKA] || {};
      Object.keys(t).forEach(function (c) {
        var el = podleCesty(c);
        if (!el) return;
        el.textContent = t[c].novy;
        el.classList.add('up-nahled-zmena');
        el.setAttribute('title', 'Původně: ' + t[c].puvodni);
        pt++;
      });
      var pz = (d.poznamky || {})[STRANKA] || {};
      Object.keys(pz).forEach(function (id) { vykresliPoznamku('n' + id, pz[id], false, true); pp++; });
    });
    var pocet = l.querySelector('.up-pocet');
    pocet.textContent = pt || pp ? (pt + ' změn · ' + pp + ' poznámek na téhle stránce')
                                 : 'Na téhle stránce nic nezměnil';
  }

  function startNahled() {
    var l = postavListuNahledu();
    podrzOdkazy();
    l.querySelector('.up-pocet').textContent = 'načítám…';
    if (!window.CLARIX_DB) { l.querySelector('.up-pocet').textContent = 'úložiště není nastavené'; return; }
    fetch(window.CLARIX_DB + '?pageSize=300').then(function (r) { return r.json(); }).then(function (j) {
      DAVKY = (j.documents || []).map(function (d) {
        var f = d.fields || {}, o = {};
        try { o = JSON.parse((f.obsah && f.obsah.stringValue) || '{}'); } catch (e) {}
        return { cas: (f.cas && f.cas.stringValue) || '', kdo: (f.kdo && f.kdo.stringValue) || '',
                 texty: o.texty || {}, poznamky: o.poznamky || {} };
      }).sort(function (a, b) { return (a.cas || '').localeCompare(b.cas || ''); });
      naplnVyber(l);
      nasadNahled(l);
    }).catch(function () { l.querySelector('.up-pocet').textContent = 'nepovedlo se načíst'; });
  }

  function start() {
    if (REZIM === 'nahled') { startNahled(); return; }
    obnovTexty();
    obnovPoznamky();
    postavListu();
    podrzOdkazy();
    prepniTexty(true);
    var b = document.querySelector('.up-texty');
    if (b) { b.classList.add('up-aktivni'); b.textContent = 'Texty: zapnuto'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
