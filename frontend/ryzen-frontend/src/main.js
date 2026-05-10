import './style.scss'
import Typed from 'typed.js';


// for placeholder


function startAnimation() {

    const recordPlayer = document.getElementById("overlay");

    recordPlayer.classList.add("animate");
}

const typed = new Typed('#typed', {
    strings: ['student','coder','noise-maker'],
    typeSpeed: 200,
    backSpeed: 50,
    showCursor: true,
    cursorChar: '|',
    loop: true,
  });