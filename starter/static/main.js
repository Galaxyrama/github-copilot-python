// Client-side rendering and interaction for the Flask-backed Sudoku.
const SIZE = 9;
let puzzle = [];
let gameId = null;
let difficulty = 'medium';
let timerInterval = null;
let elapsedSeconds = 0;
let hintsUsed = 0;
let gameCompleted = false;

function showMessage(text, kind = 'error') {
  const message = document.getElementById('message');
  message.textContent = text;
  message.classList.toggle('completed', kind === 'completed');
  message.style.color = kind === 'error' ? '#d32f2f' : '';
}

function currentBoard() {
  const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
  const board = [];
  for (let row = 0; row < SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < SIZE; col++) {
      const value = inputs[row * SIZE + col].value;
      board[row][col] = value ? Number.parseInt(value, 10) : 0;
    }
  }
  return board;
}

function updateTimerDisplay() {
  document.getElementById('timer').textContent = Scoreboard.formatTime(elapsedSeconds);
}

function resetGameStatus(newDifficulty) {
  clearInterval(timerInterval);
  elapsedSeconds = 0;
  hintsUsed = 0;
  gameCompleted = false;
  difficulty = newDifficulty;
  document.getElementById('difficulty-level').textContent =
    difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  document.getElementById('hints-used').textContent = '0';
  document.getElementById('scoreboard-status').textContent = '';
  updateTimerDisplay();
  document.getElementById('hint').disabled = false;
  timerInterval = setInterval(() => {
    elapsedSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function createBoardElement() {
  const boardDiv = document.getElementById('sudoku-board');
  boardDiv.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'sudoku-row';
    for (let col = 0; col < SIZE; col++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.maxLength = 1;
      input.className = 'sudoku-cell';
      input.dataset.row = row;
      input.dataset.col = col;
      input.addEventListener('input', async (event) => {
        const cell = event.currentTarget;
        const value = cell.value.replace(/[^1-9]/g, '');
        cell.value = value;
        cell.classList.remove('incorrect');
        if (value) cell.classList.add('user-entry');
        else cell.classList.remove('user-entry');
        if (value && !gameCompleted) {
          try {
            await checkForCompletion();
          } catch (error) {
            showMessage(error.message || 'Unable to check the solution.');
          }
        }
      });
      rowDiv.appendChild(input);
    }
    boardDiv.appendChild(rowDiv);
  }
}

function renderPuzzle(newPuzzle) {
  puzzle = newPuzzle;
  createBoardElement();
  const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const input = inputs[row * SIZE + col];
      const value = puzzle[row][col];
      if (value !== 0) {
        input.value = value;
        input.disabled = true;
        input.classList.add('prefilled');
      }
    }
  }
}

async function newGame(newDifficulty) {
  try {
    const response = await fetch(`/new?difficulty=${encodeURIComponent(newDifficulty)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to start a new game.');

    gameId = data.game_id;
    renderPuzzle(data.puzzle);
    resetGameStatus(data.difficulty);
    showMessage('');
  } catch (error) {
    showMessage(error.message || 'Unable to start a new game.');
  }
}

async function checkForCompletion() {
  if (gameCompleted) return;
  const board = currentBoard();
  if (board.some((row) => row.some((value) => value === 0))) return;

  const response = await fetch('/check', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({board, game_id: gameId}),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Unable to check the solution.');
  }

  const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
  inputs.forEach((input, index) => {
    if (input.disabled || input.readOnly) return;
    input.classList.toggle(
      'incorrect',
      data.incorrect.some(([row, col]) => row * SIZE + col === index),
    );
  });

  if (data.incorrect.length === 0) await completeGame(inputs);
  else showMessage('Some cells are incorrect.');
}

async function completeGame(inputs) {
  if (gameCompleted) return;
  gameCompleted = true;
  clearInterval(timerInterval);
  inputs.forEach((input) => {
    if (!input.disabled) input.readOnly = true;
  });
  document.getElementById('hint').disabled = true;

  const level = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  showMessage(
    `Congratulations! You solved the ${level} puzzle in ${Scoreboard.formatTime(elapsedSeconds)} with ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}!`,
    'completed',
  );

  const status = document.getElementById('scoreboard-status');
  try {
    if (Scoreboard.qualifies(elapsedSeconds)) {
      const submittedName = window.prompt('You made the Top 10! Enter your name:', 'Player');
      const name = submittedName && submittedName.trim() ? submittedName.trim() : 'Player';
      Scoreboard.addScore({
        name,
        timeSeconds: elapsedSeconds,
        level,
        hints: hintsUsed,
      });
      status.textContent = 'Your time was added to the Top 10.';
    }
    Scoreboard.render();
  } catch (error) {
    status.textContent = `Scoreboard unavailable: ${error.message}`;
  }
}

async function checkSolution() {
  try {
    const board = currentBoard();
    const response = await fetch('/check', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board, game_id: gameId}),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || 'Unable to check the solution.');
    }

    const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
    inputs.forEach((input, index) => {
      if (input.disabled || input.readOnly) return;
      input.classList.toggle(
        'incorrect',
        data.incorrect.some(([row, col]) => row * SIZE + col === index),
      );
    });
    if (data.incorrect.length === 0 && board.every((row) => row.every(Boolean))) {
      await completeGame(inputs);
    } else if (data.incorrect.length > 0) {
      showMessage('Some cells are incorrect.');
    } else {
      showMessage('Keep going — some cells are still empty.');
    }
  } catch (error) {
    showMessage(error.message || 'Unable to check the solution.');
  }
}

async function requestHint() {
  if (gameCompleted || !gameId) return;
  const button = document.getElementById('hint');
  button.disabled = true;
  try {
    const response = await fetch('/hint', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({board: currentBoard(), game_id: gameId}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Unable to get a hint.');

    const input = document.querySelector(
      `.sudoku-cell[data-row="${data.row}"][data-col="${data.col}"]`,
    );
    if (!input || input.value) throw new Error('The hinted cell is no longer empty.');
    input.value = data.value;
    input.readOnly = true;
    input.classList.add('cell-hinted');
    hintsUsed += 1;
    document.getElementById('hints-used').textContent = String(hintsUsed);
    showMessage('');
    await checkForCompletion();
  } catch (error) {
    showMessage(error.message || 'Unable to get a hint.');
  } finally {
    button.disabled = gameCompleted;
  }
}

window.addEventListener('load', () => {
  const difficultyModal = document.getElementById('difficulty-modal');
  document.getElementById('new-game').addEventListener('click', () => {
    difficultyModal.showModal();
  });
  document.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => {
      difficultyModal.close();
      newGame(button.dataset.difficulty);
    });
  });
  document.getElementById('cancel-new-game').addEventListener('click', () => {
    difficultyModal.close();
  });
  difficultyModal.addEventListener('click', (event) => {
    if (event.target === difficultyModal) difficultyModal.close();
  });
  document.getElementById('check-solution').addEventListener('click', checkSolution);
  document.getElementById('hint').addEventListener('click', requestHint);
  try {
    Scoreboard.render();
  } catch (error) {
    document.getElementById('scoreboard-status').textContent =
      `Scoreboard unavailable: ${error.message}`;
  }
  newGame('medium');
});
