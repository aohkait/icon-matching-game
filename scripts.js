const ICONS = [
  'check-circle','appearance','book','bookmark','diagram','doc-code','doc-image','doc-text','doc-versions','document','documents','earth','heart','home','hourglass','issue-type-objective','issue-type-test-case','key','keyboard','kind','link','list-task','lock','merge','messages','monitor','nature','notifications','package','paper-airplane','pencil','profile','quota','recipe','remove','review-list','rocket','scale','search','share','tablet','thumb-up','unlink','user','warning','work-item-issue','work-item-maintenance'
];

const BOARD_COLS = 6; // number of unique icons to pick horizontally (6 for 6x4 grid)
const PAIRS = BOARD_COLS * 2; // total unique icons needed (12)
const TOTAL_CARDS = PAIRS * 2; // 24

const board = document.querySelector('.memoryGame');

// utility: simple Fisher–Yates shuffle for arrays
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUniqueIcons(count) {
  if (count > ICONS.length) throw new Error('Not enough icons in ICONS array');
  return shuffleArray(ICONS).slice(0, count);
}

function displayName(name) {
  // convert "check-circle" -> "Check Circle"
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildDeck() {
  const picked = pickUniqueIcons(PAIRS); 
  const images = picked.map(name => ({ name, type: 'image' }));
  const texts = picked.map(name => ({ name, type: 'text' }));
  const imagesShuffled = shuffleArray(images);
  const textsShuffled = shuffleArray(texts);
  return imagesShuffled.concat(textsShuffled);
}

function iconUrl(name) {
  return `https://api.iconify.design/pajamas:${encodeURIComponent(name)}.svg`;
}

function renderBoard() {
  board.innerHTML = '';
  resetTimerAndCounters();

  const deck = buildDeck();
  deck.forEach(cardObj => {
    const { name: iconName, type } = cardObj;
    const card = document.createElement('div');
    card.className = 'memoryCard';
    card.dataset.card = iconName;
    card.dataset.type = type;

    const frontContent = type === 'image'
      ? `<img class="front-icon" src="${iconUrl(iconName)}" alt="${iconName}" />`
      : `<div class="front-text">${displayName(iconName)}</div>`;

    const backIconName = type === 'text' ? 'information' : 'question';
    const backSrc = iconUrl(backIconName);

    card.innerHTML = `
      <div class="cardInnerScale">
        <div class="cardInnerFlip">
          <div class="front-face">
            ${frontContent}
          </div>
          <div class="back-face">
            <img class="back-icon" src="${backSrc}" alt="${backIconName}" />
          </div>
        </div>
      </div>
    `;
    board.appendChild(card);
  });
}

(function setupContainerResizeBehavior() {
  const wrap = document.querySelector('.gameWrap');
  if (!wrap) return;

  const BREAKPOINT = 800;      // same logical breakpoint as CSS
  const SHRINK_RANGE = 160;    // distance above breakpoint where we show shrink

  const ro = new ResizeObserver(entries => {
    const w = Math.round(entries[0].contentRect.width);

    if (w >= BREAKPOINT + SHRINK_RANGE) {
      wrap.classList.add('withSidebar');
      wrap.classList.remove('shrinking');
    } else if (w >= BREAKPOINT) {
      // still wide enough for sidebar, but approaching breakpoint -> shrink
      wrap.classList.add('withSidebar');
      wrap.classList.add('shrinking');
    } else {
      // narrow: stacked layout
      wrap.classList.remove('withSidebar');
      wrap.classList.remove('shrinking');
    }
  });

  ro.observe(wrap);
})();

let hasFlippedCard = false;
let lockBoard = false;
let firstCard = null;
let secondCard = null;

function flipCard() {
  if (lockBoard) return;
  if (this === firstCard) return;

  if (!timerInterval && !startTime) startTimer();

  this.classList.add('flip');

  if (!hasFlippedCard) {
    hasFlippedCard = true;
    firstCard = this;
    return;
  }

  secondCard = this;
  turnsCount += 1;
  updateTurnsDisplay();

  checkForMatch();
}

function checkForMatch() {
  const isMatch = firstCard.dataset.card === secondCard.dataset.card;
  isMatch ? disableCards() : unflipCards();
}

function disableCards() {
  firstCard.removeEventListener('click', flipCard);
  secondCard.removeEventListener('click', flipCard);
  firstCard.classList.add('solvedCard');
  secondCard.classList.add('solvedCard');
  addSolvedIcon(firstCard.dataset.card);

  matchedPairs += 1; 

  resetBoard();

  if (matchedPairs >= PAIRS) {
    stopTimer();
    alert(`Completed in ${formatTime(secondsElapsed)} with ${turnsCount} turns`);
  }
}

function unflipCards() {
  lockBoard = true; 
  setTimeout(() => {
    firstCard.classList.remove('flip');
    secondCard.classList.remove('flip');
    resetBoard();
  }, 1500);
}

function resetBoard() {
  [hasFlippedCard, lockBoard] = [false, false];
  [firstCard, secondCard] = [null, null];
}

function attachListeners() {
  const cards = document.querySelectorAll('.memoryCard');
  cards.forEach(card => card.addEventListener('click', flipCard));
}

// solved icons in sidebar
function addSolvedIcon(iconName) {
  if (!solvedListEl) return;
  if (solvedListEl.querySelector(`[data-icon="${iconName}"]`)) return;
  const item = document.createElement('div');
  item.className = 'solvedIcon';
  item.dataset.icon = iconName;
  item.innerHTML = `
    <img src="${iconUrl(iconName)}" alt="${iconName}" />
    <div class="solvedName">${displayName(iconName)}</div>
  `;
  solvedListEl.appendChild(item);
}

// timer and turns tracking 
const timeEl = document.getElementById('time');
const turnsEl = document.getElementById('turns');
const solvedListEl = document.querySelector('.solvedList');

let timerInterval = null;
let startTime = null;
let secondsElapsed = 0;
let turnsCount = 0;
let matchedPairs = 0;

function formatTime(sec) {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function updateTimerDisplay() {
  timeEl.textContent = formatTime(secondsElapsed);
}

function updateTurnsDisplay() {
  turnsEl.textContent = String(turnsCount);
}

function startTimer() {
  if (timerInterval) return;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
    updateTimerDisplay();
  }, 250);
}

function stopTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  // final tick to ensure exact time
  secondsElapsed = Math.floor((Date.now() - startTime) / 1000);
  updateTimerDisplay();
}

function resetTimerAndCounters() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  secondsElapsed = 0;
  turnsCount = 0;
  matchedPairs = 0;
  updateTimerDisplay();
  updateTurnsDisplay();
  if (solvedListEl) solvedListEl.innerHTML = '';
}

// initialize game
function init() {
  renderBoard();
  attachListeners();
}

init();