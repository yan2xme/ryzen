import Typed from 'typed.js';

// ─────────────────────────────────────────
// TYPED.JS
// ─────────────────────────────────────────
export function initTyped() {
  const typedEl = document.querySelector('#typed');
  if (!typedEl) return;

  new Typed('#typed', {
    strings: [
      'noise-maker',
      'matcha brewer',
      'manual exposure dialer',
      'pixel pusher',
      'guitarist',
      'film photographer',
      'logic',
      'openness'
    ],
    typeSpeed: 200,
    backSpeed: 50,
    showCursor: true,
    cursorChar: '|',
    loop: true,
  });
}