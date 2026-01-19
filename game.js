// ===== GAME STATE =====
let currentScore = 0;
let highScore = localStorage.getItem('kidsai_highscore') || 0;
let currentCards = [];
let correctAnswers = 0;
let totalAnswered = 0;
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;
let draggedCard = null;
let cardCounts = { green: 0, yellow: 0, red: 0 };

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 KidsAI.bg Game - Loaded!');
  updateHighScore();
  initGame();
  initModals();
});

// ===== GAME INITIALIZATION =====
function initGame() {
  generateCards();
  setupDragAndDrop();
  setupButtons();
}

// ===== GENERATE CARDS =====
function generateCards() {
  const cardsContainer = document.getElementById('cardsContainer');
  cardsContainer.innerHTML = '';
  currentCards = [];
  correctAnswers = 0;
  totalAnswered = 0;
  cardCounts = { green: 0, yellow: 0, red: 0 };

  // Select 5 random questions (mix from all zones)
  const greenCards = getRandomCards(gameQuestions.green, 2);
  const yellowCards = getRandomCards(gameQuestions.yellow, 2);
  const redCards = getRandomCards(gameQuestions.red, 1);

  const allCards = [
    ...greenCards.map(text => ({ text, zone: 'green', emoji: zoneEmojis.green })),
    ...yellowCards.map(text => ({ text, zone: 'yellow', emoji: zoneEmojis.yellow })),
    ...redCards.map(text => ({ text, zone: 'red', emoji: zoneEmojis.red }))
  ];

  // Shuffle
  currentCards = shuffleArray(allCards);

  // Create card elements
  currentCards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'game-card';
    cardElement.draggable = true;
    cardElement.dataset.zone = card.zone;
    cardElement.dataset.index = index;
    cardElement.innerHTML = `
      <div class="card-emoji">${card.emoji}</div>
      <div class="card-text">${card.text}</div>
      <div class="card-hint"><i class="fas fa-hand-pointer"></i> Влачи ме към зоната</div>
    `;

    // Add event listeners
    cardElement.addEventListener('dragstart', handleDragStart);
    cardElement.addEventListener('dragend', handleDragEnd);

    // Touch events for mobile
    cardElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    cardElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    cardElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    cardsContainer.appendChild(cardElement);
  });

  updateCardsLeft();
  clearDropZones();
  updateScore();
}

// ===== HELPER FUNCTIONS =====
function getRandomCards(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function clearDropZones() {
  ['Green', 'Yellow', 'Red'].forEach(zone => {
    const container = document.getElementById(`dropped${zone}`);
    if (container) {
      // Keep only the counter element
      const counter = container.querySelector('.cards-counter');
      container.innerHTML = '';
      if (counter) container.appendChild(counter);
    }
  });
  
  // Hide all counters at start
  ['Green', 'Yellow', 'Red'].forEach(zone => {
    const counter = document.getElementById(`counter${zone}`);
    if (counter) counter.style.display = 'none';
  });
}

// ===== DRAG AND DROP =====
function setupDragAndDrop() {
  const dropZones = document.querySelectorAll('.drop-zone');
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', handleDrop);
    zone.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  e.target.classList.add('dragging');
  draggedCard = e.target;
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedCard = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
  e.dataTransfer.dropEffect = 'move';
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  const dropZone = e.currentTarget;
  dropZone.classList.remove('drag-over');

  if (!draggedCard) return;

  const droppedZone = dropZone.dataset.zone;
  const correctZone = draggedCard.dataset.zone;
  const cardIndex = draggedCard.dataset.index;
  const cardData = currentCards[cardIndex];

  processCardDrop(draggedCard, dropZone, droppedZone, correctZone, cardData);
}

// ===== TOUCH EVENTS FOR MOBILE =====
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  isDragging = true;
  draggedCard = e.target.closest('.game-card');
  if (draggedCard) {
    draggedCard.classList.add('dragging');
  }
}

function handleTouchMove(e) {
  if (!isDragging || !draggedCard) return;
  e.preventDefault();

  const touch = e.touches[0];
  const currentX = touch.clientX;
  const currentY = touch.clientY;

  // Move the card visually
  draggedCard.style.position = 'fixed';
  draggedCard.style.left = (currentX - draggedCard.offsetWidth / 2) + 'px';
  draggedCard.style.top = (currentY - draggedCard.offsetHeight / 2) + 'px';
  draggedCard.style.zIndex = '9999';
  draggedCard.style.pointerEvents = 'none';

  // Highlight drop zone
  const dropZones = document.querySelectorAll('.drop-zone');
  dropZones.forEach(zone => {
    const rect = zone.getBoundingClientRect();
    if (currentX >= rect.left && currentX <= rect.right &&
        currentY >= rect.top && currentY <= rect.bottom) {
      zone.classList.add('drag-over');
    } else {
      zone.classList.remove('drag-over');
    }
  });
}

function handleTouchEnd(e) {
  if (!isDragging || !draggedCard) return;
  e.preventDefault();

  const touch = e.changedTouches[0];
  const currentX = touch.clientX;
  const currentY = touch.clientY;

  // Find which drop zone the card was dropped on
  const dropZones = document.querySelectorAll('.drop-zone');
  let targetZone = null;

  dropZones.forEach(zone => {
    const rect = zone.getBoundingClientRect();
    if (currentX >= rect.left && currentX <= rect.right &&
        currentY >= rect.top && currentY <= rect.bottom) {
      targetZone = zone;
    }
    zone.classList.remove('drag-over');
  });

  // Reset card position
  draggedCard.style.position = '';
  draggedCard.style.left = '';
  draggedCard.style.top = '';
  draggedCard.style.zIndex = '';
  draggedCard.style.pointerEvents = '';
  draggedCard.classList.remove('dragging');

  if (targetZone) {
    const droppedZone = targetZone.dataset.zone;
    const correctZone = draggedCard.dataset.zone;
    const cardIndex = draggedCard.dataset.index;
    const cardData = currentCards[cardIndex];

    processCardDrop(draggedCard, targetZone, droppedZone, correctZone, cardData);
  }

  isDragging = false;
  draggedCard = null;
}

// ===== PROCESS CARD DROP =====
function processCardDrop(cardElement, dropZone, droppedZone, correctZone, cardData) {
  const isCorrect = droppedZone === correctZone;
  totalAnswered++;

  if (isCorrect) {
    correctAnswers++;
    currentScore += 20;
  }

  // Update card count for this zone
  cardCounts[droppedZone]++;

  // Create dropped card display (stack style)
  const zoneCapitalized = droppedZone.charAt(0).toUpperCase() + droppedZone.slice(1);
  const droppedContainer = document.getElementById(`dropped${zoneCapitalized}`);
  const counter = document.getElementById(`counter${zoneCapitalized}`);

  // Update counter
  if (counter) {
    counter.textContent = cardCounts[droppedZone];
    counter.style.display = 'block';
  }

  const droppedCard = document.createElement('div');
  droppedCard.className = 'dropped-card';
  droppedCard.style.zIndex = cardCounts[droppedZone];
  droppedCard.innerHTML = `
    <div class="dropped-card-content">
      <div class="dropped-card-emoji">${cardData.emoji}</div>
      <div class="dropped-card-info">
        <div class="dropped-card-text">${cardData.text}</div>
        <div class="dropped-card-feedback ${isCorrect ? 'correct' : 'incorrect'}">
          <i class="fas fa-${isCorrect ? 'check-circle' : 'times-circle'}"></i>
          ${isCorrect ? 'Правилно!' : 'Грешно!'}
        </div>
      </div>
    </div>
  `;

  droppedContainer.appendChild(droppedCard);

  // Remove card from deck
  cardElement.style.display = 'none';

  // Update UI
  updateScore();
  updateCardsLeft();

  // Check if game is complete
  setTimeout(checkGameComplete, 500);
}

// ===== UPDATE UI =====
function updateScore() {
  document.getElementById('currentScore').textContent = currentScore;
  if (currentScore > highScore) {
    highScore = currentScore;
    localStorage.setItem('kidsai_highscore', highScore);
    updateHighScore();
  }
}

function updateHighScore() {
  document.getElementById('highScore').textContent = highScore;
}

function updateCardsLeft() {
  const remaining = document.querySelectorAll('.game-card:not([style*="display: none"])').length;
  document.getElementById('cardsLeft').textContent = remaining;
}

// ===== CHECK GAME COMPLETE =====
function checkGameComplete() {
  const remainingCards = document.querySelectorAll('.game-card:not([style*="display: none"])').length;
  if (remainingCards === 0) {
    setTimeout(() => showCelebration(), 800);
  }
}

// ===== MODALS =====
function initModals() {
  // Tutorial modal
  const tutorialModal = document.getElementById('tutorialModal');
  const tutorialBtn = document.getElementById('tutorialBtn');
  const closeTutorial = document.getElementById('closeTutorial');
  const startGameBtn = document.getElementById('startGameBtn');

  tutorialBtn.onclick = () => showTutorial();
  closeTutorial.onclick = () => tutorialModal.style.display = 'none';
  startGameBtn.onclick = () => {
    tutorialModal.style.display = 'none';
  };

  // Celebration modal
  const celebrationModal = document.getElementById('celebrationModal');
  const closeCelebration = document.getElementById('closeCelebration');
  const playAgainBtn = document.getElementById('playAgainBtn');

  closeCelebration.onclick = () => celebrationModal.style.display = 'none';
  playAgainBtn.onclick = () => {
    celebrationModal.style.display = 'none';
    newGame();
  };

  // Close on outside click
  window.onclick = (event) => {
    if (event.target === tutorialModal) {
      tutorialModal.style.display = 'none';
    }
    if (event.target === celebrationModal) {
      celebrationModal.style.display = 'none';
    }
  };
}

function showTutorial() {
  document.getElementById('tutorialModal').style.display = 'block';
}

function showCelebration() {
  const accuracy = Math.round((correctAnswers / totalAnswered) * 100);

  document.getElementById('finalScore').textContent = currentScore + ' точки';
  document.getElementById('correctAnswers').textContent = correctAnswers;
  document.getElementById('totalCards').textContent = totalAnswered;
  document.getElementById('accuracyPercent').textContent = accuracy + '%';

  let message = '';
  if (accuracy >= 80) {
    message = '🎉 Невероятно! Вие сте експерт в Тризоните на AI!';
  } else if (accuracy >= 60) {
    message = '👍 Много добре! Продължавайте да учите заедно!';
  } else {
    message = '🤔 Има какво още да научите. Опитайте пак!';
  }

  document.getElementById('celebrationMessage').textContent = message;
  document.getElementById('celebrationModal').style.display = 'block';
}

// ===== BUTTONS =====
function setupButtons() {
  document.getElementById('newGameBtn').onclick = newGame;
}

function newGame() {
  currentScore = 0;
  updateScore();
  generateCards();
}

// Console greeting
console.log('%c🎯 KidsAI.bg - Game Ready!', 'color: #2c3e50; font-size: 18px; font-weight: bold;');
console.log('%c✅ Touch support enabled', 'color: #27ae60; font-size: 14px;');
console.log('%c✅ 198 questions loaded', 'color: #27ae60; font-size: 14px;');
console.log('%c🚀 Let\'s play!', 'color: #3498db; font-size: 14px; font-weight: bold;');
