/* Rammen om spillene (Runeborg, Regnehelten, Eventyrbiblioteket).
   Hvert spil er sin egen side, og en browser slipper fuld skærm, så snart man skifter side.
   Derfor åbnes spillene inde i /spil/ramme/ (én side med en iframe): fuld skærm sættes på rammen
   og overlever, når man går fra biblioteket ind i et spil og tilbage igen.

   Scriptet står øverst i <head> på spilsiderne og gør to ting:
   1. Er siden åbnet direkte, sender den besøgende videre til /spil/ramme/#<den samme adresse>.
      Alle eksisterende links virker altså uændret.
   2. Giver spillet LFFuld (kan/er/skift/paaSkift), som styrer rammens fulde skærm.
   Med #foto=… (skærmbilleder via tools/*-billeder.py) eller ?ramme=nej springes rammen over. */
(function () {
  var ER_RAMME = /^\/spil\/ramme\/?/.test(location.pathname);
  var PAA_LANG = (function () { try { return window.top !== window; } catch (e) { return true; } })();

  // 1. Åbnet direkte: gå via rammen
  if (!ER_RAMME && !PAA_LANG) {
    if (/foto=|ramme=nej/.test(location.hash + location.search)) { /* skærmbilleder: ingen ramme */ }
    else {
      location.replace('/spil/ramme/#' + location.pathname + location.search + location.hash);
      window.LFFuld = ingenFuld();
      return;
    }
  }

  function ingenFuld() { return { kan: false, er: function () { return false; }, skift: function () { }, paaSkift: function () { } }; }

  // 2. Fuld skærm
  var lyttere = [];
  var rammen = null;
  try { if (PAA_LANG && window.parent.LFRamme) rammen = window.parent.LFRamme; } catch (e) { }

  if (rammen) {
    window.LFFuld = {
      kan: rammen.kan,
      er: function () { return rammen.er(); },
      skift: function () { rammen.skift(); },
      paaSkift: function (f) { lyttere.push(f); }
    };
    // Rammen sender besked ved skift (og lige efter hver ny side er indlæst)
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.lf !== 'fuld') return;
      lyttere.forEach(function (f) { try { f(!!e.data.til); } catch (x) { } });
    });

    // Links til resten af sitet (konto, voksne, hub …) skal åbne i hele vinduet, ikke inde i rammen
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target || e.defaultPrevented) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin) return;
      if (!/^\/spil\/(runeborg|regnehelten|biblioteket)\//.test(u.pathname)) a.target = '_top';
    }, true);
  } else {
    // Ingen ramme (skærmbillede eller fejl): fuld skærm på siden selv
    var rod = document.documentElement;
    var kan = !!(rod.requestFullscreen || rod.webkitRequestFullscreen);
    var er = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
    window.LFFuld = {
      kan: kan, er: er,
      skift: function () {
        if (!kan) return;
        if (er()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
        var p = (rod.requestFullscreen || rod.webkitRequestFullscreen).call(rod);
        if (p && p.catch) p.catch(function () { });
      },
      paaSkift: function (f) { lyttere.push(f); }
    };
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, function () { lyttere.forEach(function (f) { f(er()); }); });
    });
  }
})();
