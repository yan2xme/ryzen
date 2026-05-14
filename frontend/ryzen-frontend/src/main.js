import './style.scss'
import Typed from 'typed.js';
import myEllipse from './assets/Ellipse.png';
import gradient from './assets/linearGradient.svg';
import { initThreeTurntable, updatePlayback } from './three-turntable.js';
import { createClient } from '@supabase/supabase-js'

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

// Dynamic relative time: "2m ago", "1h ago", "5d ago", "12-12-2012"
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

  // Fallback to MM-DD-YYYY for old dates
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

// ─────────────────────────────────────────
// SUPABASE GLOBAL STATS (POSTS)
// ─────────────────────────────────────────
async function getPostStats(slugs) {
  if (!supabase || !Array.isArray(slugs) || !slugs.length) return {};
  const { data, error } = await supabase
    .from('post_stats')
    .select('slug, likes_count')
    .in('slug', slugs);

  if (error) {
    console.error('[Ryzen] Stats fetch error:', error.message, '| code:', error.code);
    return {};
  }
  const map = {};
  (data || []).forEach(row => { map[row.slug] = row.likes_count || 0; });
  return map;
}

async function getCommentCounts(slugs) {
  if (!supabase || !Array.isArray(slugs) || !slugs.length) return {};
  const { data, error } = await supabase
    .from('comments')
    .select('slug')
    .in('slug', slugs);

  if (error) {
    console.error('[Ryzen] Comment count error:', error.message, '| code:', error.code);
    return {};
  }
  const counts = {};
  (data || []).forEach(c => { counts[c.slug] = (counts[c.slug] || 0) + 1; });
  return counts;
}

async function getSingleCommentCount(slug) {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('slug', slug);

  if (error) {
    console.error('[Ryzen] Single comment count error:', error.message, '| code:', error.code);
    return 0;
  }
  return count || 0;
}

async function incrementGlobalLikes(slug) {
  if (!supabase) return 0;
  const { data: existing, error: fetchErr } = await supabase
    .from('post_stats')
    .select('likes_count')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchErr) {
    console.error('[Ryzen] Like fetch error:', fetchErr.message, '| code:', fetchErr.code);
  }

  const newCount = (existing?.likes_count || 0) + 1;
  const { error: upsertErr } = await supabase
    .from('post_stats')
    .upsert({ slug, likes_count: newCount }, { onConflict: 'slug' });

  if (upsertErr) {
    console.error('[Ryzen] Like upsert error:', upsertErr.message, '| code:', upsertErr.code);
    return existing?.likes_count || 0;
  }
  return newCount;
}

// ─────────────────────────────────────────
// HOMEPAGE (Feed + Stories)
// ─────────────────────────────────────────
function initHomepage() {
  const feedContainer = document.getElementById("post-feed");
  const storyContainer = document.getElementById("storyContainer");
  const searchInput = document.getElementById("searchInput");

  // ─── INSTAGRAM-STYLE STORY SCROLLING ───
  const leftArrow = document.querySelector('.leftArrow');
  const rightArrow = document.querySelector('.rightArrow');

  if (leftArrow && rightArrow && storyContainer) {
    // Scroll by roughly 2.5 stories at a time
    const scrollAmount = 250;

    leftArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }
  // ───────────────────────────────────────

  if (!feedContainer && !storyContainer) return;

  async function fetchPosts(queryStr) {
    if (!feedContainer) return;
    try {
      const res = await fetch(buildSanityUrl(queryStr));
      const { result } = await res.json();
      feedContainer.innerHTML = "";

      if (!result || !result.length) return;

      const slugs = result.map(p => p.slug.current).filter(Boolean);
      const [statsMap, commentMap] = await Promise.all([
        getPostStats(slugs),
        getCommentCounts(slugs)
      ]);

      result.forEach(post => {
        const slug = post.slug.current;
        const likes = statsMap[slug] || 0;
        const comments = commentMap[slug] || 0;
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
              <img src="${myEllipse}" alt="Profile Picture" class="pfp" />
              <p class="footerText">Klent Tangaro</p>
              <div class="butts">
                <button class="buttonDimension2 like-outer" type="button">${formatNumber(likes)}</button>
                <button class="buttonDimension3" type="button" onclick="window.location.href='../article.html?slug=${slug}#ryzen-comments'">${comments}</button>
              </div>
            </footer>

          </article><br><br>`;
        feedContainer.appendChild(div);

        // ⭐ OUTER STAR — black indicator on click
        const likeBtnOuter = div.querySelector('.like-outer');
        likeBtnOuter.addEventListener('click', async (e) => {
          e.preventDefault();
          const newCount = await incrementGlobalLikes(slug);
          likeBtnOuter.innerText = formatNumber(newCount);
          likeBtnOuter.classList.add('is-liked');
        });
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
        });

        storyContainer.appendChild(div);
      });
    })
    .catch(error => console.error("[Ryzen] Story fetch failed:", error));
}

function openStoryOverlay(story, imageUrl) {
  const overlay = document.querySelector(".overlayEffect");
  if (!overlay) return;

  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('story', story.slug.current);
  window.history.pushState({ path: newUrl.href }, '', newUrl.href);

  // ─── DATE FORMAT FIX ───
  // Convert the ugly ISO string into a clean, readable format
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
        <div class="storyProfile"><img src="${myEllipse}" alt="Profile" /></div>
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
      const [globalLikes, commentCount] = await Promise.all([
        getPostStats([currentSlug]).then(m => m[currentSlug] || 0),
        getSingleCommentCount(currentSlug)
      ]);

      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `
        <article>
          <h1 class="indicator">BLOG</h1>
          <h1 class="tt">${escapeHtml(result.title)}</h1>
          <p>Yapped on: ${result.datePosted}</p>
          <br><hr class="articleLine" /><br>
          <img class="articleImg" src="${imageUrl}" alt="${escapeHtml(result.title)}" />
          <footer class="articleInside">
            <img src="${myEllipse}" alt="Profile Picture" class="pfp" />
            <p class="footerText">Klent Tangaro</p>
            <div class="butts2">
              <button class="buttonDimension2 likeBtn" type="button">${formatNumber(globalLikes)}</button>
              <button class="buttonDimension3 commentCountBtn" type="button">${commentCount}</button>
              <button class="buttonDimension5 neoBrutal2 shareBtn" type="button">Share</button>
            </div>
          </footer>
          <br /><hr class="articleLine" /><br />
          <div class="content">
            <p class="body">${result.content.map(c => parseRichText(c)).join("<br><br>")}</p>
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

      // ⭐ INNER STAR — black indicator on click
      const likeBtn = div.querySelector('.likeBtn');
      likeBtn.addEventListener('click', async () => {
        const newCount = await incrementGlobalLikes(currentSlug);
        likeBtn.innerText = formatNumber(newCount);
        likeBtn.classList.add('is-liked');
      });
    })
    .catch(error => console.error("[Ryzen] Inner fetch failed:", error));
}

// ─────────────────────────────────────────
// THREADED COMMENTS
// ─────────────────────────────────────────
function initComments() {
  const postBtn = document.getElementById('postCommentBtn');
  const commentSection = document.querySelector('.commentSection');
  const hrLine = commentSection?.querySelector('.commentLine');
  const nameInput = document.getElementById('commenterName');
  const mainTextarea = document.querySelector('.commentFieldInner');

  if (!postBtn || !hrLine || !currentSlug) return;
  if (!supabase) {
    console.warn('[Ryzen] Supabase unavailable. Comment system disabled.');
    return;
  }

  // Wire up main composer toolbar
  const boldBtn = document.getElementById('boldBtn');
  const italicBtn = document.getElementById('italicBtn');
  const cancelBtn = commentSection?.querySelector('.footerCommentField .buttonDimension8');

  if (boldBtn && mainTextarea) {
    boldBtn.addEventListener('click', () => wrapSelection(mainTextarea, '**', '**'));
  }
  if (italicBtn && mainTextarea) {
    italicBtn.addEventListener('click', () => wrapSelection(mainTextarea, '*', '*'));
  }
  if (cancelBtn && mainTextarea) {
    cancelBtn.addEventListener('click', () => { mainTextarea.value = ''; });
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('slug', currentSlug)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Ryzen] Comments fetch error:', error.message, '| code:', error.code);
      return;
    }
    if (!data || !data.length) return;

    const rootContainer = document.createElement('div');
    rootContainer.className = 'comments-root';
    hrLine.insertAdjacentElement('afterend', rootContainer);

    const rootComments = data.filter(c => !c.parent_id);
    rootComments.forEach(comment => {
      rootContainer.appendChild(createCommentNode(comment, data));
    });
  }

  function createCommentNode(comment, allComments) {
    const date = timeAgo(comment.created_at);
    const childCount = allComments.filter(c => c.parent_id === comment.id).length;

    const div = document.createElement('div');
    div.className = 'comment1';

    div.innerHTML = `
      <div class="userCommentHeader">
        <div class="userPfp">
          <img src="${myEllipse}" alt="PFP" class="pfp">
          <div>
            <p class="userName">${escapeHtml(comment.name)}</p>
            <p class="date">${date}</p>
          </div>
        </div>
      </div>
      <p class="comment-body">${parseRichText(comment.content)}</p>
      <div class="commentFooter" style="display:flex; gap:2rem; align-items:center; margin-bottom:0.75rem; font-family:Inconsolata;">
        <button class="buttonDimension2 commentStarBtn" type="button" style="margin:0;">0</button>
        <button class="buttonDimension3" type="button" style="margin:0;">${childCount}</button>
        <button class="buttonDimension12 replyBtn" type="button" style="margin:0;">Reply</button>
      </div>
      <div class="replies-section" style="display:none; margin-left:2rem; border-left:2px solid black; padding-left:1rem;"></div>
    `;

    const repliesSection = div.querySelector('.replies-section');
    const replyBtn = div.querySelector('.replyBtn');
    const starBtn = div.querySelector('.commentStarBtn');

    let commentLikes = 0;
    starBtn.addEventListener('click', () => {
      commentLikes += 1;
      starBtn.innerText = formatNumber(commentLikes);
      starBtn.classList.add('is-liked');
    });

    const children = allComments.filter(c => c.parent_id === comment.id);
    if (children.length > 0) {
      repliesSection.style.display = 'block';
      children.forEach(child => {
        repliesSection.appendChild(createCommentNode(child, allComments));
      });
    }

    replyBtn.addEventListener('click', () => {
      const existing = repliesSection.querySelector('.reply-input-wrapper');
      if (existing) existing.remove();

      repliesSection.style.display = 'block';

      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'reply-input-wrapper';
      inputWrapper.style.marginTop = '1rem';
      inputWrapper.style.marginBottom = '1.5rem';
      inputWrapper.innerHTML = `
        <div class="commentFieldOuter">
          <textarea class="commentFieldInner" placeholder="////Type your comment here////" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" style="width:90%;"></textarea>
          <div class="footerCommentField">
            <div class="left">
              <button class="buttonDimension6 reply-bold" type="button"></button>
              <button class="buttonDimension7 reply-italic" type="button"></button>
            </div>
            <div class="right">
              <button class="buttonDimension8 reply-cancel" type="button">Cancel</button>
              <button class="buttonDimension9 reply-post" type="button">Post</button>
            </div>
          </div>
        </div>
      `;

      repliesSection.insertBefore(inputWrapper, repliesSection.firstChild);

      const ta = inputWrapper.querySelector('textarea');
      ta.focus();

      inputWrapper.querySelector('.reply-bold').addEventListener('click', () => wrapSelection(ta, '**', '**'));
      inputWrapper.querySelector('.reply-italic').addEventListener('click', () => wrapSelection(ta, '*', '*'));

      inputWrapper.querySelector('.reply-cancel').addEventListener('click', () => {
        inputWrapper.remove();
        if (repliesSection.children.length === 0) repliesSection.style.display = 'none';
      });

      inputWrapper.querySelector('.reply-post').addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text) return;

        const name = nameInput?.value || 'Guest';
        const { error } = await supabase.from('comments').insert([{
          name,
          content: text,
          slug: currentSlug,
          parent_id: comment.id
        }]);

        if (error) {
          console.error('[Ryzen] Reply post error:', error.message, '| code:', error.code);
          alert('Failed to post reply. See console for details.');
        } else {
          location.reload();
        }
      });
    });

    return div;
  }

  postBtn.addEventListener('click', async () => {
    const text = mainTextarea?.value.trim();
    if (!text) return;

    const name = nameInput?.value || 'Guest';
    const { error } = await supabase.from('comments').insert([{
      name,
      content: text,
      slug: currentSlug
    }]);

    if (error) {
      console.error('[Ryzen] Post comment error:', error.message, '| code:', error.code);
      alert('Failed to post comment. See console for details.');
    } else {
      location.reload();
    }
  });

  loadComments();
}

// ─────────────────────────────────────────
// TURNTABLE
// ─────────────────────────────────────────
function initTurntable() {
  const right1 = document.querySelector('.right1');
  if (right1) {
    initThreeTurntable(right1);
  }

  const ttEls = {
    status: document.querySelector('.right1 > p:first-child'),
    bigText: document.querySelector('.songText'),
    disc: document.querySelector('.overlay'),
    albumArt: document.querySelector('.albumArt'),
    artist: document.querySelector('.artist'),
    song: document.querySelector('.name'),
    album: document.querySelector('.albumName'),
    time: document.querySelector('.time'),
  };

  if (!ttEls.song || !ttEls.disc) return;

  let ttState = {
    isPlaying: false, progressMs: 0, durationMs: 0, lastSyncTime: 0,
    isDragging: false, discRotation: 0, lastPointerAngle: 0, liveTimer: null,
  };

  const audioPlayer = new Audio();
  audioPlayer.volume = 0.4;
  let audioReady = false;
  let currentPreview = null;
  let pendingPlay = false;

  audioPlayer.addEventListener('ended', () => {
    if (audioPlayer.src) {
      audioPlayer.currentTime = 0;
      audioPlayer.play().catch(() => { });
    }
  });

  function tryPlay() {
    if (!audioPlayer.src) return;
    audioPlayer.play().catch(() => { });
  }

  function syncAudio(previewUrl, isPlaying) {
    if (!isPlaying || !previewUrl) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      if (!previewUrl) {
        audioPlayer.src = '';
        currentPreview = null;
      }
      pendingPlay = false;
      return;
    }
    if (currentPreview !== previewUrl) {
      currentPreview = previewUrl;
      audioPlayer.src = previewUrl;
    }
    pendingPlay = true;
    if (audioReady) tryPlay();
  }

  function unlockAudio() {
    if (audioReady) return;
    audioReady = true;
    if (pendingPlay && audioPlayer.paused) tryPlay();
  }

  ['pointerdown', 'click', 'touchstart', 'keydown', 'scroll', 'mousemove'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });

  function updateTime(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    if (ttEls.time) ttEls.time.innerText = `${m}:${s}`;
  }

  function getRotation(el) {
    const tr = window.getComputedStyle(el, null).getPropertyValue('transform');
    if (tr === 'none') return 0;
    const vals = tr.split('(')[1].split(')')[0].split(',');
    return Math.round(Math.atan2(parseFloat(vals[1]), parseFloat(vals[0])) * (180 / Math.PI));
  }

  function getAngle(x, y, rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(y - cy, x - cx);
  }

  function startLiveTimer() {
    if (ttState.liveTimer) clearInterval(ttState.liveTimer);
    ttState.liveTimer = setInterval(() => {
      if (!ttState.isPlaying || ttState.isDragging) return;
      const elapsed = Date.now() - ttState.lastSyncTime;
      let cur = ttState.progressMs + elapsed;
      if (ttState.durationMs && cur > ttState.durationMs) cur = ttState.durationMs;
      updateTime(cur);
    }, 100);
  }

  function stopLiveTimer() {
    if (ttState.liveTimer) clearInterval(ttState.liveTimer);
  }

  if (ttEls.disc) {
    ttEls.disc.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ttState.isDragging = true;
      ttEls.disc.setPointerCapture(e.pointerId);
      ttState.discRotation = getRotation(ttEls.disc);
      ttEls.disc.classList.remove('animate');
      ttEls.disc.style.transform = `rotate(${ttState.discRotation}deg)`;
      const rect = ttEls.disc.getBoundingClientRect();
      ttState.lastPointerAngle = getAngle(e.clientX, e.clientY, rect);
    });

    ttEls.disc.addEventListener('pointermove', (e) => {
      if (!ttState.isDragging) return;
      const rect = ttEls.disc.getBoundingClientRect();
      const angle = getAngle(e.clientX, e.clientY, rect);
      let delta = (angle - ttState.lastPointerAngle) * (180 / Math.PI);
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      ttState.discRotation += delta;
      ttState.lastPointerAngle = angle;
      ttEls.disc.style.transform = `rotate(${ttState.discRotation}deg)`;
    });

    ttEls.disc.addEventListener('pointerup', () => {
      ttState.isDragging = false;
      if (!ttState.isPlaying) return;
      const normalized = ((ttState.discRotation % 360) + 360) % 360;
      const cycle = 10;
      ttEls.disc.style.animationDelay = `${-((normalized / 360) * cycle)}s`;
      ttEls.disc.style.transform = '';
      ttEls.disc.classList.add('animate');
    });

    ttEls.disc.addEventListener('pointercancel', () => {
      ttEls.disc.dispatchEvent(new Event('pointerup'));
    });
  }

  async function syncTurntable() {
    if (!ttEls.song) return;

    updatePlayback(ttState.isPlaying, ttState.progressMs, ttState.durationMs);

    try {
      const res = await fetch('/api/spotify');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      ttEls.song.innerText = data.title || 'Unknown';
      ttEls.artist.innerText = data.artist || 'Unknown';
      ttEls.bigText.innerText = (data.artist || 'SILENCE').toUpperCase();
      if (data.album) ttEls.album.innerText = data.album;
      if (ttEls.albumArt) ttEls.albumArt.src = data.albumImageUrl || './src/assets/albumArt.jpg';

      ttState.isPlaying = !!data.isPlaying;
      ttState.progressMs = data.progressMs || 0;
      ttState.durationMs = data.durationMs || 0;
      ttState.lastSyncTime = Date.now();

      syncMarquee();

      if (ttState.isPlaying) {
        if (ttEls.status) ttEls.status.innerText = 'NOW PLAYING';
        if (!ttState.isDragging && ttEls.disc) ttEls.disc.classList.add('animate');
        updateTime(ttState.progressMs);
        startLiveTimer();
        syncAudio(data.previewUrl, true);
      } else {
        if (!ttState.isDragging && ttEls.disc) ttEls.disc.classList.remove('animate');
        stopLiveTimer();
        if (ttEls.time) ttEls.time.innerText = '--:--';
        syncAudio(null, false);

        if (data.playedAt) {
          const diffMin = Math.floor((Date.now() - new Date(data.playedAt)) / 60000);
          if (ttEls.status) {
            ttEls.status.innerText = diffMin < 60 ? `PLAYED ${diffMin}M AGO` : `PLAYED ${Math.floor(diffMin / 60)}H AGO`;
          }
        } else {
          if (ttEls.status) ttEls.status.innerText = 'SILENCE';
        }
      }
    } catch (err) {
      console.error('[Ryzen] Turntable sync error:', err);
      syncAudio(null, false);
    }
  }

  syncTurntable();
  setInterval(syncTurntable, 5000);

  function syncMarquee() {
    const content = document.querySelector('.marquee-content');
    if (!content) return;
    const artist = ttEls.artist.innerText || 'Unknown';
    const song = ttEls.song.innerText || 'Unknown';
    const album = ttEls.album.innerText || '';
    const separator = '<p> • </p>';
    const copy = `<p class="artist">${artist}</p>${separator}<p class="name">${song}</p>${separator}<p class="albumName">${album}</p>${separator}`;
    content.innerHTML = copy + copy;
  }
}

// ─────────────────────────────────────────
// TYPED.JS
// ─────────────────────────────────────────
function initTyped() {
  const typedEl = document.querySelector('#typed');
  if (!typedEl) return;

  new Typed('#typed', {
    strings: ['student', 'coder', 'noise-maker'],
    typeSpeed: 200,
    backSpeed: 50,
    showCursor: true,
    cursorChar: '|',
    loop: true,
  });
}

// ─────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTyped();
  initTurntable();
  initHomepage();
  initArticlePage();
  initComments();
});

// ─── MOBILE SIDEBAR TOGGLE ───
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.leftside');

  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      // Toggles the sliding animation we set in SCSS
      sidebar.classList.toggle('active');
    });

    // Close the sidebar if they click outside of it
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
      }
    });
  }
});