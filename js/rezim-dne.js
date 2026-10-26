/* CLARIX — denní režim vzhledu
   Při každé nové návštěvě se vzhled určí podle hodin:
     6:00–19:59  světlý
     20:00–5:59  tmavý
   Když si návštěvník přepne vzhled sám přepínačem, jeho volba platí,
   dokud nezavře prohlížeč. Pak se zase rozhoduje podle hodin. */
(function () {
  var HRANICE_TMA = 20, HRANICE_SVETLO = 6;
  var KLIC = 'clarix-theme', SEZENI = 'clarix-rezim-sezeni', RUCNE = 'clarix-rezim-rucne';

  function ls(k, v) { try { if (!window.localStorage) return null;
    return arguments.length > 1 ? localStorage.setItem(k, v) : localStorage.getItem(k); } catch (e) { return null; } }
  function ss(k, v) { try { if (!window.sessionStorage) return null;
    return arguments.length > 1 ? sessionStorage.setItem(k, v) : sessionStorage.getItem(k); } catch (e) { return null; } }

  function podleHodin() {
    var h = new Date().getHours();
    return (h >= HRANICE_TMA || h < HRANICE_SVETLO) ? 'dark' : 'light';
  }
  function nastav(rezim) {
    ls(KLIC, rezim);
    if (document.documentElement) document.documentElement.dataset.theme = rezim;
  }

  /* nová návštěva = vzhled podle hodin, stará uložená volba se nebere */
  if (ss(SEZENI) !== '1') { ss(SEZENI, '1'); nastav(podleHodin()); }
  else if (ss(RUCNE) !== '1') { nastav(podleHodin()); }
  else { var u = ls(KLIC); if (u) nastav(u); }

  /* vlastní přepnutí návštěvníkem má přednost po zbytek jeho prohlížení */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#theme-toggle');
    if (t) ss(RUCNE, '1');
  }, true);

  /* přelom 20:00 / 6:00 za chodu, pokud si vzhled nepřepnul sám */
  setInterval(function () {
    if (ss(RUCNE) === '1') return;
    var chce = podleHodin();
    if (document.documentElement.dataset.theme !== chce) nastav(chce);
  }, 60000);
})();
