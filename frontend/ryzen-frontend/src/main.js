import './style.scss'
import Typed from 'typed.js';
import myEllipse from './assets/Ellipse.png';
import gradient from './assets/linearGradient.svg';


function startAnimation() {

  const recordPlayer = document.getElementById("overlay");

  recordPlayer.classList.add("animate");
}




const typed = new Typed('#typed', {
  strings: ['student', 'coder', 'noise-maker'],
  typeSpeed: 200,
  backSpeed: 50,
  showCursor: true,
  cursorChar: '|',
  loop: true,
});

let projectID = "usuc0cod";
let dataset = "production";

const urlParams = new URLSearchParams(window.location.search);
const currentSlug = urlParams.get('slug');


let query = encodeURIComponent(`*[_type == "post"] {
  title,
  datePosted,
  blogPosterImage{asset},
  "content": content[].children[].text,
  slug{current}
}`);


let query2 = encodeURIComponent(`*[_type == "stories"] {
  datePosted,
  storyContent{asset},
  slug{current}
}`);

let URL = `https://${projectID}.api.sanity.io/v2026-05-10/data/query/${dataset}?query=${query}`;
let URL2 = `https://${projectID}.api.sanity.io/v2026-05-10/data/query/${dataset}?query=${query2}`;

function fetchPosts(query) {
  const encodedQuery = encodeURIComponent(query);
  const searchUrl = `https://${projectID}.api.sanity.io/v2021-10-21/data/query/${dataset}?query=${encodedQuery}`;

  fetch(searchUrl)
    .then(res => res.json())
    .then(({ result }) => {
      const feedContainer = document.getElementById("post-feed");

      feedContainer.innerHTML = "";

      result.forEach(post => {
        // FIXED: The missing image processing logic is back
        let imageRef = post.blogPosterImage.asset._ref;
        let parts = imageRef.split('-');
        let realImageUrl = `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;

        const div = document.createElement('div');
        div.className = 'post'; // Set back to 'post' based on your original CSS

        // FIXED: <div"> typo removed and content[] is safeguarded
        div.innerHTML = `
          <article class="outer neoBrutal">
          <a href="../article.html?slug=${post.slug.current}" class="tt">${post.title}</a>
          <p>Yapped on: ${post.datePosted}</p>
                <br>
          <hr class="articleLine" />
          <br>
          <div> 
          <p class="enclosure">
            ${post.content[0]?.children[0]?.text || "Loading preview..."}
          </p>
          </div>
          <img class="articleImg" src="${realImageUrl}" />

          <footer>
            <img
              src="${myEllipse}"
              alt="Profile Picture"
              class="pfp"
            />
            <p class="footerText">Klent Tangaro</p>
            <div class="butts">
              <button class="buttonDimension2" type="button">1.5k</button>
              <button class="buttonDimension3" type="button">67</button>
            </div>
          </footer>
        </article>
        <br><br>`;

        feedContainer.appendChild(div);
      });
    })
    .catch(err => console.error("Fetch failed:", err));
}

const searchInput = document.getElementById("searchInput");
if (searchInput) {
  let searchTimeout;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
      if (searchTerm === "") {
        // FIXED: Calling fetchPosts (plural)
        fetchPosts('*[_type == "post"] | order(datePosted desc)');
      } else {
        // FIXED: Calling fetchPosts (plural)
        const searchQuery = `*[_type == "post" && title match "${searchTerm}*"] | order(datePosted desc)`;
        fetchPosts(searchQuery);
      }
    }, 300);
  });
}

// Load the default feed when the page first opens
fetchPosts('*[_type == "post"] | order(datePosted desc)');

//story fetching
fetch(URL2)
  .then((response) => response.json())
  .then(({ result }) => {
    const storyContainer = document.getElementById("storyContainer");

    result.forEach(stories => {

      const div = document.createElement('div');
      let imageRef = stories.storyContent.asset._ref;
      let parts = imageRef.split('-');
      let realImageUrl2 = `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;

      div.className = 'story';
      // 1. Fixed the "a a" typo here
      div.innerHTML = `<a href="/story/${stories.slug.current}" class="story-trigger" data-slug="${stories.slug.current}">
                <div class="polShadow"><img src="${realImageUrl2}" class="pol"></div>
              </a>`;

      const trigger = div.querySelector('.story-trigger');

      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const clickedSlug = e.currentTarget.getAttribute('data-slug');
        triggerStory(clickedSlug);
      });

      function triggerStory(clickedSlug) {

        const newUrl = new window.URL(window.location.href);
        newUrl.searchParams.set('story', clickedSlug);
        window.history.pushState({ path: newUrl.href }, '', newUrl.href);
        const overlay = document.querySelector(".overlayEffect");
        overlay.innerHTML = `
         <div class="storyContentOverlay neoBrutal">
        <div class="storyHeader">
          <div class="storyProfile">
            <img src="${myEllipse}" />
          </div>
          <button class="closeStory"></button>
          <div class="storyFont">Klent Tangaro</div>
          <div class="storyFont2">${stories.datePosted}</div>
          <img src="${gradient}" /> <img />
        </div>
        <img src="${realImageUrl2}" alt="story" />
      </div>`;

        overlay.classList.add("active");

        // 3. MAGIC URL CLEANUP: Remove the parameter when closing
        overlay.querySelector(".closeStory").onclick = () => {
          overlay.classList.remove("active");

          const cleanUrl = new window.URL(window.location.href);
          cleanUrl.searchParams.delete('story');
          window.history.replaceState({}, '', cleanUrl.href);
        };
      }

      // 4. DELETED div.addEventListener("click", triggerStory); from here!
      storyContainer.appendChild(div);
    });
  })
  .catch((error) => {
    console.error("The fetch failed entirely:", error);
  });


//inner post feed fetching
const postInnerContainer = document.getElementById("postInnerFeed");
if (postInnerContainer) {
  let query3 = encodeURIComponent(`*[_type == "post" && slug.current == "${currentSlug}" ] {
  title,
  datePosted,
  blogPosterImage{asset},
  "content": content[].children[].text,
  slug{current}
} [0]`);


  let URL3 = `https://${projectID}.api.sanity.io/v2026-05-10/data/query/${dataset}?query=${query3}`;

  fetch(URL3)
    .then((response) => response.json())
    .then(({ result }) => {
      const postInnerContainer = document.getElementById("postInnerFeed");
      const div = document.createElement('div');

      let imageRef = result.blogPosterImage.asset._ref;
      let parts = imageRef.split('-');
      let realImageUrl3 = `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;

      div.className = 'post';

      div.innerHTML = `<article>
          <h1 class="indicator">BLOG</h1>
          <h1 class="tt">${result.title}</h1>
                    <p>Yapped on: ${result.datePosted}</p>
                <br>
          <hr class="articleLine" />
          <br>
          <img class="articleImg" src="${realImageUrl3}" />

          <footer class="articleInside">
            <img
              src="${myEllipse}"
              alt="Profile Picture"
              class="pfp"
            />
            <p class="footerText">Klent Tangaro</p>

            <div class="butts2">
              <button class="buttonDimension2" type="button">1.5k</button>
              <button class="buttonDimension3" type="button">67</button>
              <button class="buttonDimension5 neoBrutal2" type="button">
                Share
              </button>
            </div>
          </footer>
          <br />

          <hr class="articleLine" />

          <br />

          <div class="content">
            <p class="body">
            ${result.content.join("<br><br>")}
            </p>
            <br />
          </div>

          <br />
          <br />
        </article>`
        ; postInnerContainer.appendChild(div);

    })
    .catch((error) => {
      console.error("The fetch failed entirely:", error);
    });
}

// ─── TURNTABLE STATE ───
let ttState = {
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  lastSyncTime: 0,
  isDragging: false,
  discRotation: 0,
  lastPointerAngle: 0,
  liveTimer: null,
};

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

function updateTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  ttEls.time.innerText = `${m}:${s}`;
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

// ─── SCRATCH / NUDGE ───
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
  const cycle = 10; // MUST match your SCSS: animation: spin 10s
  ttEls.disc.style.animationDelay = `${-((normalized / 360) * cycle)}s`;
  ttEls.disc.style.transform = '';
  ttEls.disc.classList.add('animate');
});

ttEls.disc.addEventListener('pointercancel', () => {
  ttEls.disc.dispatchEvent(new Event('pointerup'));
});

// ─── SYNC ───
async function syncTurntable() {
  try {
    const res = await fetch('/api/spotify');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    ttEls.song.innerText = data.title || 'Unknown';
    ttEls.artist.innerText = data.artist || 'Unknown';
    ttEls.bigText.innerText = (data.artist || 'SILENCE').toUpperCase();
    if (data.album) ttEls.album.innerText = data.album;

    ttEls.albumArt.src = data.albumImageUrl || './src/assets/albumArt.jpg';

    ttState.isPlaying = !!data.isPlaying;
    ttState.progressMs = data.progressMs || 0;
    ttState.durationMs = data.durationMs || 0;
    ttState.lastSyncTime = Date.now();

    if (ttState.isPlaying) {
      ttEls.status.innerText = 'NOW PLAYING';
      if (!ttState.isDragging) ttEls.disc.classList.add('animate');
      updateTime(ttState.progressMs);
      startLiveTimer();
    } else {
      if (!ttState.isDragging) ttEls.disc.classList.remove('animate');
      stopLiveTimer();
      ttEls.time.innerText = '--:--';

      if (data.playedAt) {
        const diffMin = Math.floor((Date.now() - new Date(data.playedAt)) / 60000);
        ttEls.status.innerText = diffMin < 60
          ? `PLAYED ${diffMin}M AGO`
          : `PLAYED ${Math.floor(diffMin / 60)}H AGO`;
      } else {
        ttEls.status.innerText = 'SILENCE';
      }
    }
  } catch (err) {
    console.error('Turntable sync error:', err);
  }
}

syncTurntable();
setInterval(syncTurntable, 10000);