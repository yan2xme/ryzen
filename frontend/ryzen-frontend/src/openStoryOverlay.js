import {timeAgo} from './timeAgo.js';
import gradient from './assets/linearGradient.svg';


export function openStoryOverlay(story, imageUrl) {

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