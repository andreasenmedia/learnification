/* Demo: fuld skærm på siden selv (der er ingen ramme om demoen) */
(function () {
  var rod = document.documentElement, lyttere = [];
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
})();
