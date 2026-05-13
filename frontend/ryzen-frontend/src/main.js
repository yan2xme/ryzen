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



//outer feed post fetching
fetch(URL)
  .then((response) => response.json())
  .then(({ result }) => {
    const feedContainer = document.getElementById("post-feed");

    result.forEach(post => {

      const div = document.createElement('div');

      let imageRef = post.blogPosterImage.asset._ref;

      // 2. Split the ID at the dashes to remove "image" and fix the "jpg" at the end
      let parts = imageRef.split('-'); // breaks it into: ["image", "041d...", "3130x2075", "jpg"]

      // 3. Put it back together into a real web link
      let realImageUrl = `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;

      div.className = 'post';
      div.innerHTML = `<article class="outer neoBrutal">
          <a href="../article.html?slug=${post.slug.current}" class="tt">${post.title}</a>
          <p>Yapped on: ${post.datePosted}</p>
                <br>
          <hr class="articleLine" />
          <br>
          <div"> 
          <p class="enclosure">
            ${post.content[0]}
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
        <br><br>`
        ; feedContainer.appendChild(div);
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