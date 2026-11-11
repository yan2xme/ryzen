import './style.scss'
import Typed from 'typed.js';
import myEllipse from '/image.png';
import gradient from './assets/linearGradient.svg';
import { initThreeTurntable, updatePlayback } from './three-turntable.js';
import { createClient } from '@supabase/supabase-js'
import { inject } from '@vercel/analytics'

// Initialize Vercel Web Analytics
inject();

// ─────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('[Ryzen] Supabase env vars missing. Comments & global stats are disabled.');
}

const projectID = "usuc0cod";
const dataset = "production";
const sanityApiVersion = "v2026-05-10";

const urlParams = new URLSearchParams(window.location.search);
const currentSlug = urlParams.get('slug');

// ─────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────
const avatarOptions = [
  myEllipse,
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Daisy',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Gizmo'
];

function createAvatarSelector(defaultSrc = avatarOptions[0], onChangeCallback = null) {
  const container = document.createElement('div');
  container.className = 'avatar-selector';
  container.style.cssText = 'display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;';

  let currentSelectedSrc = defaultSrc;

  avatarOptions.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.dataset.avatarUrl = url;
    img.style.cssText = `width:32px; height:32px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:border 0.2s; object-fit:cover;`;

    if (url === defaultSrc) img.style.borderColor = 'black';

    img.addEventListener('click', () => {
      currentSelectedSrc = url;
      container.querySelectorAll('img').forEach(i => i.style.borderColor = 'transparent');
      img.style.borderColor = 'black';
      if (onChangeCallback) onChangeCallback(url);
    });

    container.appendChild(img);
  });

  container.getSelectedAvatar = () => currentSelectedSrc;

  container.setSelectedAvatar = (url) => {
    currentSelectedSrc = url;
    container.querySelectorAll('img').forEach(img => {
      img.style.borderColor = img.dataset.avatarUrl === url ? 'black' : 'transparent';
    });
    if (onChangeCallback) onChangeCallback(url);
  };

  return container;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseRichText(text) {
  if (!text) return '';
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

function buildSanityUrl(query) {
  return `https://${projectID}.api.sanity.io/${sanityApiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
}

function sanityImageUrl(assetRef) {
  const parts = assetRef.split('-');
  return `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;
}

function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
}

function wrapSelection(textarea, open, close) {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);
  textarea.value = before + open + selected + close + after;
  textarea.selectionStart = start + open.length;
  textarea.selectionEnd = end + open.length;
  textarea.focus();
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

// ─────────────────────────────────────────
// HOMEPAGE (Feed + Stories)
// ─────────────────────────────────────────


function openStoryOverlay(story, imageUrl) {

  const overlay = document.querySelector(".overlayEffect");
  if (!overlay) return;

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('story', story.slug.current);
  window.history.pushState({ path: newUrl.href }, '', newUrl.href);

  const rawDate = new Date(story.datePosted);
  const formattedDate = isNaN(rawDate)
    ? story.datePosted
    : rawDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

  overlay.innerHTML = `
    <div class="storyContentOverlay neoBrutal">
      <div class="storyHeader">
        <div class="storyProfile"><img src="/image.png" alt="Profile" /></div>
        <button class="closeStory" aria-label="Close story"></button>
        <div class="storyFont">Klent Tangaro</div>
        <div class="storyFont2">${timeAgo(story.datePosted)} • ${formattedDate}</div>
        <img src="${gradient}" alt="" />
      </div>
      <img src="${imageUrl}" alt="story" />
    </div>`;

  overlay.classList.add("active");
  overlay.querySelector(".closeStory").onclick = () => {
    overlay.classList.remove("active");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('story');
    window.history.replaceState({}, '', cleanUrl.href);
  };

  
}

function initHomepage() {
  const feedContainer = document.getElementById("post-feed");
  const storyContainer = document.getElementById("storyContainer");
  const searchInput = document.getElementById("searchInput");

  const leftArrow = document.querySelector('.leftArrow');
  const rightArrow = document.querySelector('.rightArrow');

  if (leftArrow && rightArrow && storyContainer) {
    const scrollAmount = 250;
    leftArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    rightArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }


  if (!feedContainer && !storyContainer) return;

  async function fetchPosts(queryStr) {
    if (!feedContainer) return;
    try {
      const res = await fetch(buildSanityUrl(queryStr));
      const { result } = await res.json();
      feedContainer.innerHTML = "";

      if (!result || !result.length) return;


      result.forEach(post => {
        const slug = post.slug.current;
        const imageUrl = sanityImageUrl(post.blogPosterImage.asset._ref);
        const preview = post.content?.[0]?.children?.[0]?.text || "Loading preview...";

        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `
          <article class="outer neoBrutal">
            <a href="../article.html?slug=${slug}" class="tt">${escapeHtml(post.title)}</a>
            <p>Yapped on: ${post.datePosted}</p><br><hr class="articleLine" /><br>
            <div>
              <p class="enclosure">${escapeHtml(preview)}</p>
            </div>
            <img class="articleImg" src="${imageUrl}" alt="${escapeHtml(post.title)}" />
            <footer>
              <img src="/image.png" alt="Profile Picture" class="pfp" />
              <p class="footerText">Klent Tangaro</p>
              <div class="butts">
              </div>
            </footer>
          </article><br><br>`;
        feedContainer.appendChild(div);
      });
    } catch (err) {
      console.error("[Ryzen] Sanity fetch failed:", err);
    }
  }

  if (searchInput && feedContainer) {
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.trim().replace(/"/g, '\\"');
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (searchTerm === "") {
          fetchPosts('*[_type == "post"] | order(datePosted desc)');
        } else {
          const searchQuery = `*[_type == "post" && title match "${searchTerm}*"] | order(datePosted desc)`;
          fetchPosts(searchQuery);
        }
      }, 300);
    });
  }

  if (feedContainer) {
    fetchPosts('*[_type == "post"] | order(datePosted desc)');
  }

  if (!storyContainer) return;

  fetch(buildSanityUrl(`*[_type == "stories"] { datePosted, storyContent{asset}, slug{current} }`))
    .then(res => res.json())
    .then(({ result }) => {
      if (!result || !result.length) return;
      storyContainer.innerHTML = "";

      result.forEach(story => {
        const imageUrl = sanityImageUrl(story.storyContent.asset._ref);
        const div = document.createElement('div');
        div.className = 'story';
        div.innerHTML = `
          <a href="/story/${story.slug.current}" class="story-trigger" data-slug="${story.slug.current}">
            <div class="polShadow"><img src="${imageUrl}" class="pol" alt="story"></div>
          </a>`;

        const trigger = div.querySelector('.story-trigger');
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          openStoryOverlay(story, imageUrl);
          console.log("bayot");
        });

        storyContainer.appendChild(div);
      });
    })
    .catch(error => console.error("[Ryzen] Story fetch failed:", error));
}




// ─────────────────────────────────────────
// ARTICLE / BLOG PAGE
// ─────────────────────────────────────────
function initArticlePage() {
  const postInnerContainer = document.getElementById("postInnerFeed");
  if (!postInnerContainer || !currentSlug) return;

  const query = `*[_type == "post" && slug.current == "${currentSlug}"] { title, datePosted, blogPosterImage{asset}, "content": content[].children[].text, slug{current} } [0]`;

  fetch(buildSanityUrl(query))
    .then(res => res.json())
    .then(async ({ result }) => {
      if (!result) {
        postInnerContainer.innerHTML = '<p>Post not found.</p>';
        return;
      }

      document.title = `${result.title} | Ryzen`;

      const imageUrl = sanityImageUrl(result.blogPosterImage.asset._ref);

      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `
        <article>
          <h1 class="indicator">BLOG</h1>
          <h1 class="tt">${escapeHtml(result.title)}</h1>
          <p>Yapped on: ${result.datePosted}</p>
          <br><hr class="articleLine" /><br>
          <img class="articleImgInner" src="${imageUrl}" alt="${escapeHtml(result.title)}" />
          <footer class="articleInside">
            <img src="/image.png" alt="Profile Picture" class="pfp" />
            <p class="footerText">Klent Tangaro</p>
            <div class="butts2">
              <button class="buttonDimension5 neoBrutal2 shareBtn" type="button">Share</button>
            </div>
          </footer>
          <br /><hr class="articleLine" /><br />
          <div class="content">
            <p class="body">${result.content.map(c => parseRichText(c)).join("<br>")}</p>
            <br />
          </div>
          <br /><br />
        </article>`;

      postInnerContainer.appendChild(div);

      const shareBtn = div.querySelector('.shareBtn');
      shareBtn.addEventListener('click', async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: result.title, url: window.location.href });
          } else {
            await navigator.clipboard.writeText(window.location.href);
            shareBtn.innerText = "Copied!";
            setTimeout(() => shareBtn.innerText = "Share", 2000);
          }
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Share error:', err);
        }
      });
    })
    .catch(error => console.error("[Ryzen] Inner fetch failed:", error));
}



// ─────────────────────────────────────────
// TURNTABLE
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// TYPED.JS
// ─────────────────────────────────────────
function initTyped() {
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

// ─────────────────────────────────────────
// BOOTSTRAP & HISTORY ROUTING
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

// ─── MOBILE SIDEBAR TOGGLE ───
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.leftside');

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  }
});

function fitToTwoLines(el, minRem = 5, maxRem = 25) {
  if (!el) return;

  const step = 0.25;

  // Temporarily set clean measurement styles
  el.style.transition = 'none';
  el.style.lineHeight = '1';
  el.style.maxHeight = 'none';
  el.style.overflow = 'visible';

  // Binary search: find the BIGGEST font size that fits in exactly 2 lines
  let lo = minRem, hi = maxRem, best = minRem;

  while (hi - lo >= step) {
    const mid = Math.round(((lo + hi) / 2) / step) * step;
    el.style.fontSize = mid + 'rem';

    const fs = parseFloat(getComputedStyle(el).fontSize);
    const twoLineHeight = fs * 2;

    if (el.scrollHeight <= twoLineHeight + 1) {
      best = mid;
      lo = mid + step;
    } else {
      hi = mid - step;
    }
  }

  el.style.fontSize = best + 'rem';

  // Restore original styles
  el.style.lineHeight = '0.8';
  el.style.maxHeight = '1.7em';
  el.style.overflow = 'hidden';
  el.style.transition = 'font-size 0.25s ease';
}

const songText = document.querySelector('.songText');

document.fonts.ready.then(() => fitToTwoLines(songText));
window.addEventListener('resize', () => fitToTwoLines(songText));