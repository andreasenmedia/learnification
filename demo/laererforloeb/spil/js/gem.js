/* Demo: gemmer kun i denne browser (localStorage). Intet sendes til serveren. */
(function () {
  'use strict';
  var RB = window.RB = window.RB || {};
  RB.gem = {
    hent: function (lokal) { return Promise.resolve(lokal || null); },
    gem: function () { },
    nulstil: function () { return Promise.resolve(); },
    naarKonflikt: function () { },
    tagNyeste: function () { return null; }
  };
})();
