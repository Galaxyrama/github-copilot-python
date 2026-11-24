// Client-side rendering and interaction for the Flask-backed Sudoku
const SIZE = 9;
let puzzle = [];
let timerInterval;
let elapsedSeconds = 0;
let hintsUsed = 0;

function resetGameStatus(difficulty) {
  clearInterval(timerInterval);
  elapsedSeconds = 0;
  hintsUsed = 0;
  document.getElementById('difficulty-level').textContent =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  document.getElementById('timer').textContent = '00:00';
  document.getElementById('hints-used').textContent = '0';
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let j = 0; j < SIZE; j++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = i;
      input.dataset.col = j;
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^1-9]/g, '');
        e.target.value = val;
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(puz) {
  puzzle = puz;
  createBoardElement();
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = puzzle[i][j];
      const inp = inputs[idx];
      if (val !== 0) {
        inp.value = val;
        inp.disabled = true;
        inp.className += ' prefilled';
      } else {
        inp.value = '';
        inp.disabled = false;
      }
    }
  }
}

async function newGame(difficulty) {
  const msg = document.getElementById('message');
  try {
    const res = await fetch(`/new?difficulty=${encodeURIComponent(difficulty)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unable to start a new game.');
    }
    renderPuzzle(data.puzzle);
    resetGameStatus(data.difficulty);
    msg.innerText = '';
  } catch (error) {
    msg.style.color = '#d32f2f';
    msg.innerText = error.message || 'Unable to start a new game.';
  }
}

async function checkSolution() {
  const boardDiv = document.getElementById('sudoku-board');
  const inputs = boardDiv.getElementsByTagName('input');
  const board = [];
  for (let i = 0; i < SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < SIZE; j++) {
      const idx = i * SIZE + j;
      const val = inputs[idx].value;
      board[i][j] = val ? parseInt(val, 10) : 0;
    }
  }
  const res = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board})
  });
  const data = await res.json();
  const msg = document.getElementById('message');
  if (data.error) {
    msg.style.color = '#d32f2f';
    msg.innerText = data.error;
    return;
  }
  const incorrect = new Set(data.incorrect.map(x => x[0]*SIZE + x[1]));
  for (let idx = 0; idx < inputs.length; idx++) {
    const inp = inputs[idx];
    if (inp.disabled) continue;
    inp.className = 'sudoku-cell';
    if (incorrect.has(idx)) {
      inp.className = 'sudoku-cell incorrect';
    }
  }
  if (incorrect.size === 0) {
    msg.style.color = '#388e3c';
    msg.innerText = 'Congratulations! You solved it!';
  } else {
    msg.style.color = '#d32f2f';
    msg.innerText = 'Some cells are incorrect.';
  }
}

// Wire buttons
window.addEventListener('load', () => {
  const difficultyModal = document.getElementById('difficulty-modal');
  document.getElementById('new-game').addEventListener('click', () => {
    difficultyModal.showModal();
  });
  document.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => {
      const {difficulty} = button.dataset;
      difficultyModal.close();
      newGame(difficulty);
    });
  });
  document.getElementById('cancel-new-game').addEventListener('click', () => {
    difficultyModal.close();
  });
  difficultyModal.addEventListener('click', (event) => {
    if (event.target === difficultyModal) {
      difficultyModal.close();
    }
  });
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  newGame('medium');
});