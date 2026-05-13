import './style.scss'
import Typed from 'typed.js';
import myEllipse from './assets/Ellipse.png';


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

//post fetching
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
          <a href="article.html?slug=${post.slug.current}" class="tt">${post.title}</a>
          <hr class="articleLine" />
          <br />
          <p>
            ${post.content[0]}
          </p>
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

fetch(URL2)
  .then((response) => response.json())
  .then(({ result }) => {
    const storyContainer = document.getElementById("storyContainer");

    result.forEach(stories => {

      const div = document.createElement('div');

      let imageRef = stories.storyContent.asset._ref;

      // 2. Split the ID at the dashes to remove "image" and fix the "jpg" at the end
      let parts = imageRef.split('-'); // breaks it into: ["image", "041d...", "3130x2075", "jpg"]

      // 3. Put it back together into a real web link
      let realImageUrl2 = `https://cdn.sanity.io/images/${projectID}/${dataset}/${parts[1]}-${parts[2]}.${parts[3]}`;

      div.className = 'story';
      div.innerHTML = `<a href="index.html?slug=${stories.slug.current}">
                <img src="${realImageUrl2}" class="pol">
              </a>`
        ; storyContainer.appendChild(div);
    });
  })
  .catch((error) => {
    console.error("The fetch failed entirely:", error);
  });



  

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
          <img class="articleImg" src="${realImageUrl3}" />

          <footer class="articleInside">
            <img
              src="./src/assets/Ellipse.png"
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