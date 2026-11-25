import {buildSanityUrl} from './buildSanityUrl.js';
import {sanityImageUrl} from './sanityImageUrl.js';
import {escapeHtml} from './escapeHtml.js';
import {toHTML} from '@portabletext/to-html'


const urlParams = new URLSearchParams(window.location.search);
const currentSlug = urlParams.get('slug');


// ─────────────────────────────────────────
// ARTICLE / BLOG PAGE
// ─────────────────────────────────────────

export function initArticlePage() {
  const postInnerContainer = document.getElementById("postInnerFeed");
  if (!postInnerContainer || !currentSlug) return;

  const query = `
  
  *[_type == "post" && slug.current == "${currentSlug}"] { title, datePosted, blogPosterImage{asset}, content, slug{current} } [0]
  
  `;

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
            <div class="body">${
              toHTML(result.content,{})
            }</div>
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