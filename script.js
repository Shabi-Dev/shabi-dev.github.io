const slider = document.getElementById('slider-container');
const bg = document.querySelector('.background-pattern');
const buttons = [...document.querySelectorAll('.nav-btn')];
const navContainer = document.querySelector('.nav-links');

// state "energy line"
let energyRAF = null;
let energyLine = null;
let energyDot = null;

let currentPage = 0;
let targetPage = 0;

// state background animation
let wiggleAngle = 0; // incrementing angle to let background "breathe"
let lastScrollY = 0;

// coordinates of background
let bgX = 0;          // current bg horizontal offset
let bgY = 0;

// target coordinates to lerp
let targetBgX = 0;
let targetBgY = 0;

// lerp speed for smooth bg movement
const bgSpeed = 0.01;


function lerp(start, end, t) {
  return start + (end - start) * t;
}

// The sliding blue indicator that glides between buttons
const indicator = document.createElement('div');
indicator.className = 'nav-indicator';
navContainer.appendChild(indicator);

// Positions the indicator underneath the active button
function moveIndicator(page) {
  const label = buttons[page].querySelector('.label');
  const r = label.getBoundingClientRect();
  const nav = navContainer.getBoundingClientRect();

  indicator.style.left = (r.left - nav.left) + 'px';
  indicator.style.top = (r.bottom - nav.top + 5) + 'px';
  indicator.style.width = r.width + 'px';
}

// Changes page and starts animation
function goToPage(page) {
  targetPage = page;
  slider.style.transform = `translateX(${-page * 100}vw)`;

  targetBgX = -page * window.innerWidth * 0.1;

  // update active button styling
  buttons.forEach(btn => btn.classList.remove('active'));
  buttons[page].classList.add('active');

  moveIndicator(page);
}

// Animate background position smoothly
function animate() {

  // check for scroll
  const currentPageEl = document.querySelectorAll('.page')[targetPage];
  targetBgY = currentPageEl.scrollTop * 0.1;

  bgX = lerp(bgX, targetBgX, bgSpeed);
  bgY = lerp(bgY, targetBgY, bgSpeed);

  wiggleAngle += 0.01;
  const wiggleX = Math.sin(wiggleAngle) * 1.5;
  const wiggleY = Math.cos(wiggleAngle * 0.75) * 5;

  // determine background position, lerped pos + wiggle
  bg.style.backgroundPosition = `${bgX + wiggleX}px ${bgY + wiggleY}px`;

  requestAnimationFrame(animate);
}

// Stops any in-flight energy-line animation
function cancelEnergyEffects() {
  if (energyRAF !== null) {
    cancelAnimationFrame(energyRAF);
    energyRAF = null;
  }
  if (energyLine) {
    energyLine.remove();
    energyLine = null;
  }
  if (energyDot) {
    energyDot.remove();
    energyDot = null;
  }
}

// Animates the ink fill (text turning blue) + glowing energy line
function transfer(from, to) {
  if (from === to || from < 0) return;

  cancelEnergyEffects();

  const source = buttons[from];
  const target = buttons[to];

  const sourceFill = source.querySelector('.fill');
  const targetFill = target.querySelector('.fill');

  // prevent double click issues
  [sourceFill, targetFill].forEach(el => {
    el.getAnimations().forEach(a => a.cancel());
  });

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const navRect = navContainer.getBoundingClientRect();

  const right = to > from;

  // src: blue drains out of the old button
  sourceFill.animate([
    { clipPath: 'inset(0 0 0 0)' },
    { clipPath: right ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }
  ], {
    duration: 420,
    easing: 'ease-in-out',
    fill: 'forwards'
  });

  // tgt: blue fills the new button
  targetFill.animate([
    { clipPath: right ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
    { clipPath: 'inset(0 0 0 0)' }
  ], {
    duration: 420,
    delay: 280,
    easing: 'ease-in-out',
    fill: 'both'
  });

  // line definition here
  const GAP = 10;

  const startX = right
    ? sourceRect.right - navRect.left + GAP
    : sourceRect.left - navRect.left - GAP;

  const stopX = right
    ? targetRect.left - navRect.left - GAP
    : targetRect.right - navRect.left + GAP;

  const y = sourceRect.top - navRect.top + sourceRect.height * 0.5;

  const line = document.createElement('div');
  line.style.position = 'absolute';
  line.style.left = startX + 'px';
  line.style.top = y + 'px';
  line.style.width = '0px';
  line.style.height = '3px';
  line.style.pointerEvents = 'none';
  line.style.borderRadius = '999px';
  line.style.filter = 'blur(1px)';
  line.style.opacity = '1';
  line.style.zIndex = '0';

  line.style.background = right
    ? `linear-gradient(90deg, rgba(48,104,195,0), rgba(48,104,195,.15) 20%, rgba(63,139,255,.55) 45%, rgba(180,210,255,1) 100%)`
    : `linear-gradient(270deg, rgba(48,104,195,0), rgba(48,104,195,.15) 20%, rgba(63,139,255,.55) 45%, rgba(180,210,255,1) 100%)`;

  navContainer.appendChild(line);

  const headDot = document.createElement('div');
  headDot.style.position = 'absolute';
  headDot.style.width = '8px';
  headDot.style.height = '8px';
  headDot.style.borderRadius = '50%';
  headDot.style.background = '#bcd7ff';
  headDot.style.boxShadow = '0 0 10px #4a90ff, 0 0 18px #3068c3';

  navContainer.appendChild(headDot);

  energyLine = line;
  energyDot = headDot;

  // line animation
  const duration = 700;
  const CONNECT = 0.35;
  const HOLD = 0.15;
  const RETRACT = 0.50;

  const start = performance.now();

  function easeOut(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function step(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);

    let head;
    let tail;

    if (t < CONNECT) {
      // 1. grow the line from the source to dest
      const u = easeOut(t / CONNECT);
      head = startX + (stopX - startX) * u;
      tail = startX;
    } else if (t < CONNECT + HOLD) {
      // 2. pause
      head = stopX;
      tail = startX;
    } else {
      // 3. retract line
      const u = easeOut((t - CONNECT - HOLD) / RETRACT);
      head = stopX;
      tail = startX + (stopX - startX) * u;
    }

    line.style.left = Math.min(head, tail) + 'px';
    line.style.width = Math.abs(head - tail) + 'px';

    headDot.style.left = (head - 4) + 'px';
    headDot.style.top = (y - 3) + 'px';


    // extra juice
    if (t < CONNECT + HOLD) {
      headDot.style.opacity = '1';
      headDot.style.transform = 'scale(1)';
    } else {
      const u = (t - CONNECT - HOLD) / RETRACT;
      const fade = Math.max(0, 1 - u * 2);
      headDot.style.opacity = fade;
      headDot.style.transform = `scale(${0.4 + 0.6 * fade})`;
    }

    if (t < CONNECT) {
      line.style.opacity = '1';
    } else if (t < CONNECT + HOLD) {
      line.style.opacity = '0.6';
    } else {
      const u = (t - CONNECT - HOLD) / RETRACT;
      line.style.opacity = 0.6 * (1 - u);
    }

    if (t < 1) {
      energyRAF = requestAnimationFrame(step);
    } else {
      line.remove();
      headDot.remove();
      energyLine = null;
      energyDot = null;
      energyRAF = null;
    }
  }

  energyRAF = requestAnimationFrame(step);
}

// click handlers
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const pageNum = Number(btn.dataset.page);
    if (pageNum === targetPage) return;

    const fromPage = buttons.findIndex(b => b.classList.contains('active'));
    transfer(fromPage, pageNum);
    goToPage(pageNum);
  });
});

// keep the indicator aligned when the layout changes
window.addEventListener('resize', () => moveIndicator(targetPage));

// Init bruv
goToPage(0);
animate();
