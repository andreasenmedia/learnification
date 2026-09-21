/* Learnification — lidt opførsel, ikke mere end nødvendigt. */

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Luk menuen igen, hvis vinduet bliver bredt nok til den rigtige navigation
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
