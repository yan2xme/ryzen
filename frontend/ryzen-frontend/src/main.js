import './style.scss'
import {initTyped} from './typed.js';
import {initHomepage} from './initHomepage.js';
import {initArticlePage} from './initArticlePage.js';
import { inject } from '@vercel/analytics'

import { initThreeTurntable, updatePlayback } from './threeTurntable.js'; // TODO: refactor js turntable glb files

// Initialize Vercel Web Analytics
inject();

// ─────────────────────────────────────────
// HISTORY ROUTING
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTyped();
  initHomepage();
  initArticlePage();
  // ─── BROWSER HISTORY ROUTING FOR STORIES ───
  // This ensures the browser "Back" button closes the story overlay instead of breaking
  window.addEventListener('popstate', () => {
    const overlay = document.querySelector(".overlayEffect");
    if (overlay && overlay.classList.contains("active")) {
      const params = new URLSearchParams(window.location.search);
      if (!params.get('story')) {
        overlay.classList.remove("active");
      }
    }
  });
});
