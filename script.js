// ===== 要素の取得 =====
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameClearScreen = document.getElementById('game-clear-screen');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const timerDisplay = document.getElementById('time-left');
const finalScoreDisplay = document.getElementById('final-score');
const clearScoreDisplay = document.getElementById('clear-score');
const player = document.getElementById('player');
const gameArea = document.querySelector('.game-area');
const startButton = document.getElementById('start-button');
const retryButton = document.getElementById('retry-button');
const retryButtonClear = document.getElementById('retry-button-clear');
let bottomBanner;

const bgm = new Audio('bgm/motech_bgm.mp3');
bgm.loop = true;
const startSound = new Audio('bgm/motech_start.mp3');
const goalSound = new Audio('bgm/motech_goal2.mp3');

// ===== 効果音 =====
const sounds = {
  bubu: new Audio('bgm/bubu.mp3'),
  idole: new Audio('bgm/idole_get.mp3'),
  heart: new Audio('bgm/kirakira.mp3'),
  point: new Audio('bgm/jump.wav')
};
function playSound(key) {
  const se = sounds[key];
  if (!se) return;
  se.pause(); se.currentTime = 0;
  se.play().catch(e => console.warn(`効果音エラー (${key}):`, e));
}

// ===== ゲーム状態 =====
let playerX = 50, playerY = 10;
let score = 0, lives = 3, timeLeft = 60;
let gameInterval, itemInterval, countdown;
let isDragging = false, gameEnded = false;

// ===== 初期化 =====
window.addEventListener('load', () => {
  bottomBanner = document.getElementById('game-banner');
  showScoreHistory();

  startButton.addEventListener('click', () => {
    startSound.play().catch(() => {});
    bgm.currentTime = 0; bgm.play().catch(() => {});
    startGame();
  });
});

// ===== ポインタ操作 =====
document.addEventListener('pointermove', (e) => {
  if (document.body.classList.contains('game-active') && isDragging) {
    e.preventDefault();
    const offsetX = player.offsetWidth / 2;
    const offsetY = player.offsetHeight / 2 + 20;
    const x = e.clientX - gameArea.offsetLeft - offsetX;
    const y = e.clientY - gameArea.offsetTop - offsetY;
    moveTo(x, y);
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (document.body.classList.contains('game-active')) e.preventDefault();
}, { passive: false });

// ===== ゲーム開始処理 =====
function startGameCore() {
  gameInterval = setInterval(updateGame, 1000 / 60);
  function dynamicSpawn() {
    spawnItem();
    let interval = Math.random() * 200 + 300;
    if (timeLeft <= 40) interval -= 50;
    if (timeLeft <= 20) interval -= 50;
    itemInterval = setTimeout(dynamicSpawn, interval);
  }
  dynamicSpawn();

  countdown = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      endGame(true);
    }
  }, 1000);
}

function startGame() {
  document.body.classList.add('game-active');
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');
  gameClearScreen.classList.add('hidden');
  showBanner();

  score = 0; lives = 3; timeLeft = 60;
  playerX = 50; playerY = 10;
  gameEnded = false; isDragging = true;

  updateUI(); updatePlayerPosition();
  player.src = 'img/motech_bike.png';
  bgm.currentTime = 0; bgm.play().catch(() => {});
  startGameCore();
}

function retryGame() {
  gameOverScreen.classList.add('hidden');
  gameClearScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');

  clearInterval(gameInterval);
  clearTimeout(itemInterval);
  clearInterval(countdown);
  document.querySelectorAll('.falling-item').forEach(item => item.remove());

  score = 0; lives = 3; timeLeft = 60;
  playerX = 50; playerY = 10; updatePlayerPosition();
  bgm.pause(); bgm.currentTime = 0;

  isDragging = false; gameEnded = false;
  showScoreHistory();
}

function updateUI() {
  scoreDisplay.textContent = score;
  livesDisplay.textContent = lives;
  timerDisplay.textContent = timeLeft;
}
function moveTo(x, y) {
  const maxX = gameArea.clientWidth - player.offsetWidth;
  const maxY = gameArea.clientHeight - player.offsetHeight;
  playerX = Math.max(0, Math.min(x, maxX));
  playerY = Math.max(0, Math.min(y, maxY));
  updatePlayerPosition();
}
function movePlayer(dx, dy) { moveTo(playerX + dx, playerY + dy); }
function updatePlayerPosition() {
  player.style.left = `${playerX}px`;
  player.style.top = `${playerY}px`;
}

// ===== アイテム生成・移動 =====
function spawnItem() {
  const items = [
    { src: 'img/item_star.png', score: 5, weight: 30 },
    { src: 'img/item_uchiwa.png', score: 10, weight: 15 },
    { src: 'img/item_penlight.png', score: 10, weight: 15 },
    { src: 'img/item_crow.png', score: -50, weight: 15 },
    { src: 'img/item_heart_green.png', life: 1, weight: 5 },
    { src: 'img/item_poop.png', life: -1, weight: 15 },
    { src: 'img/item_idle02.png', score: 100, weight: 5 }
  ];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let rnd = Math.random() * totalWeight;
  for (const item of items) {
    if (rnd < item.weight) {
      const el = document.createElement('img');
      el.src = item.src; el.classList.add('falling-item');
      el.dataset.score = item.score || 0;
      el.dataset.life = item.life || 0;
      el.style.top = `${Math.random() * 70 + 15}%`;
      el.style.right = '-60px';
      gameArea.appendChild(el); return;
    }
    rnd -= item.weight;
  }
}
function updateGame() {
  const items = document.querySelectorAll('.falling-item');
  items.forEach(item => {
    if (!item.dataset.speed) item.dataset.speed = (Math.random() * 4 + 2).toFixed(2);
    const speed = parseFloat(item.dataset.speed);
    const r = parseFloat(item.style.right);
    item.style.right = `${r + speed}px`;

    const playerRect = player.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (playerRect.left < itemRect.right &&
        playerRect.right > itemRect.left &&
        playerRect.top < itemRect.bottom &&
        playerRect.bottom > itemRect.top) {
      const itemScore = parseInt(item.dataset.score);
      const itemLife = parseInt(item.dataset.life);
      score += itemScore; lives += itemLife;
      if (lives > 3) lives = 3;

      const filename = item.src;
      if (itemScore < 0 || itemLife < 0) {
        player.src = 'img/motech_bike02.png';
        setTimeout(() => { player.src = 'img/motech_bike.png'; }, 700);
      }
      if (filename.includes('item_crow.png') || filename.includes('item_poop.png')) playSound('bubu');
      else if (filename.includes('item_idle02.png')) playSound('idole');
      else if (filename.includes('item_heart_green.png')) playSound('heart');
      else playSound('point');

      item.remove(); updateUI();
      if (lives <= 0) endGame(false);
    }
    if (r > window.innerWidth + 100) item.remove();
  });
}

function endGame(cleared) {
  if (gameEnded) return;
  gameEnded = true; isDragging = false;
  document.body.classList.remove('game-active');

  clearInterval(gameInterval);
  clearTimeout(itemInterval);
  clearInterval(countdown);
  bgm.pause(); bgm.currentTime = 0;

  gameScreen.classList.add('hidden'); hideBanner();
  if (cleared) {
    gameClearScreen.classList.remove('hidden');
    clearScoreDisplay.textContent = score;
  } else {
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
  }

  saveScore(score); showScoreHistory();

  goalSound.pause(); goalSound.currentTime = 0; goalSound.play().catch(() => {});
  const images = ['img/game_finish1.png', 'img/game_finish2.png'];
  const randomImage = images[Math.floor(Math.random() * images.length)];
  const resultImage = document.createElement('img');
  resultImage.src = randomImage;
  resultImage.classList.add('finish-image'); 
  const targetScreen = cleared ? gameClearScreen : gameOverScreen;
  const resultArea = targetScreen.querySelector('.result-area');
  resultArea.innerHTML = ''; resultArea.appendChild(resultImage);
}

function showBanner() { bottomBanner.style.display = 'block'; }
function hideBanner() { bottomBanner.style.display = 'none'; }

// ===== スコア保存・表示 =====
function saveScore(score) {
  const scores = JSON.parse(localStorage.getItem('motech_scores')) || [];
  scores.unshift(score);
  localStorage.setItem('motech_scores', JSON.stringify(scores.slice(0, 20)));
}
function showScoreHistory() {
  const scores = JSON.parse(localStorage.getItem('motech_scores')) || [];
  const best = scores.length > 0 ? Math.max(...scores) : 0;
  const recent = scores.slice(0, 3);

  // ベストスコア
  const bestEl = document.getElementById('bestScore');
  if (bestEl) bestEl.textContent = best > 0 ? best : '-';

  // 過去3件
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`score${i+1}`);
    el.textContent = recent[i] !== undefined ? recent[i] : '-';
  }
}

// ===== リトライボタン =====
retryButton.addEventListener('click', retryGame);
retryButtonClear.addEventListener('click', retryGame);
