import {buildSanityUrl} from './buildSanityUrl.js';
import {sanityImageUrl} from './sanityImageUrl.js';
import {escapeHtml} from './escapeHtml.js';
import {openStoryOverlay} from './openStoryOverlay.js';

// ─────────────────────────────────────────
// HOMEPAGE (Feed + Stories)
// ─────────────────────────────────────────


export function initHomepage() {
  const feedContainer = document.getElementById("post-feed");
  const storyContainer = document.getElementById("storyContainer");
  const searchInput = document.getElementById("searchInput");

  const leftArrow = document.querySelector('.leftArrow');
  const rightArrow = document.querySelector('.rightArrow');

  if (leftArrow && rightArrow && storyContainer) {
    const scrollAmount = 250;
    leftArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); //left button toggle
    });
    rightArrow.addEventListener('click', () => {
      storyContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });  //right button toggle
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
