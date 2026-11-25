// Client-side rendering and interaction for the Flask-backed Sudoku.
const SIZE = 9;
let puzzle = [];
let gameId = null;
let difficulty = 'medium';
let timerInterval = null;
let elapsedSeconds = 0;
let hintsUsed = 0;
let gameCompleted = false;
let hintPending = false;
let duplicateWarningActive = false;

const THEME_STORAGE_KEY = 'sudokuTheme';

function applyTheme(theme) {
  const activeTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = activeTheme;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', String(activeTheme === 'dark'));
  toggle.setAttribute(
    'aria-label',
    activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

function initializeTheme() {
  let theme = 'light';
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') theme = savedTheme;
  } catch (error) {
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = `Unable to load saved theme: ${error.message}`;
  }
  applyTheme(theme);
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = `Unable to save theme: ${error.message}`;
  }
}

function showMessage(text, kind = 'error') {
  const message = document.getElementById('message');
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('completed', kind === 'completed');
  message.style.color = kind === 'error' ? 'var(--error-text)' : '';
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

function validateBoardConflicts(preferredCell = null) {
  const inputs = [...document.getElementById('sudoku-board').querySelectorAll('input')];
  const conflicts = new Set();
  const cellsShareUnit = (first, second) => {
    const sameRow = first.dataset.row === second.dataset.row;
    const sameColumn = first.dataset.col === second.dataset.col;
    const sameBox =
      Math.floor(Number(first.dataset.row) / 3) === Math.floor(Number(second.dataset.row) / 3) &&
      Math.floor(Number(first.dataset.col) / 3) === Math.floor(Number(second.dataset.col) / 3);
    return sameRow || sameColumn || sameBox;
  };

  for (let firstIndex = 0; firstIndex < inputs.length; firstIndex++) {
    const first = inputs[firstIndex];
    if (!first.value) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < inputs.length; secondIndex++) {
      const second = inputs[secondIndex];
      if (first.value === second.value && cellsShareUnit(first, second)) {
        conflicts.add(firstIndex);
        conflicts.add(secondIndex);
      }
    }
  }

  inputs.forEach((input, index) => input.classList.toggle('cell-conflict', conflicts.has(index)));

  if (conflicts.size > 0) {
    let sourceIndex = preferredCell ? inputs.indexOf(preferredCell) : -1;
    if (!conflicts.has(sourceIndex)) {
      sourceIndex = [...conflicts].find((index) => !inputs[index].disabled);
    }
    if (sourceIndex === undefined) sourceIndex = conflicts.values().next().value;

    const source = inputs[sourceIndex];
    const existingCells = [...conflicts]
      .filter(
        (index) =>
          index !== sourceIndex &&
          inputs[index].value === source.value &&
          cellsShareUnit(source, inputs[index]),
      )
      .map(
        (index) =>
          `row ${Number(inputs[index].dataset.row) + 1} and column ${Number(inputs[index].dataset.col) + 1}`,
      );
    duplicateWarningActive = true;
    // Removed showMessage(`Duplicate ${source.value}: already exists in ...`)
    // because after consideration the visual highlighting of the conflicting 
    // cells is sufficient feedback for the user.
  } else if (duplicateWarningActive) {
    duplicateWarningActive = false;
    // Removed showMessage('') to clear the message when conflicts are resolved.
  }

  return conflicts;
}

function updateTimerDisplay() {
  const timer = document.getElementById('timer');
  if (timer) timer.textContent = Scoreboard.formatTime(elapsedSeconds);
}

function hasEmptyCells() {
  const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
  return inputs.length !== SIZE * SIZE || [...inputs].some((input) => !input.value);
}

function updateHintButtonState() {
  const hintButton = document.getElementById('hint');
  if (hintButton) hintButton.disabled = gameCompleted || !hasEmptyCells();
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
  updateTimerDisplay();
  updateHintButtonState();
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
      if ((Math.floor(row / 3) + Math.floor(col / 3)) % 2 === 1) {
        input.classList.add('box-shade');
      }
      const clearCheckHighlight = () => {
        input.classList.remove('cell-incorrect', 'cell-checked');
      };
      input.addEventListener('click', clearCheckHighlight);
      input.addEventListener('focus', clearCheckHighlight);
      input.addEventListener('input', async (event) => {
        const cell = event.currentTarget;
        const value = cell.value.replace(/[^1-9]/g, '');
        cell.value = value;
        clearCheckHighlight();
        if (value) cell.classList.add('user-entry');
        else cell.classList.remove('user-entry');
        const conflicts = validateBoardConflicts(cell);
        updateHintButtonState();
        if (value && conflicts.size === 0 && !gameCompleted) {
          try {
            await checkForCompletion();
          } catch (error) {
            if (validateBoardConflicts().size === 0) {
              showMessage(error.message || 'Unable to check the solution.');
            }
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
  duplicateWarningActive = false;
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
    const response = await fetch(
      `/new-game?difficulty=${encodeURIComponent(newDifficulty)}`,
      {method: 'GET'},
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to start a new game.');

    gameId = data.game_id;
    renderPuzzle(data.puzzle || data.board);
    resetGameStatus(data.difficulty);
    try {
      Scoreboard.render();
    } catch (error) {
      const status = document.getElementById('scoreboard-status');
      if (status) status.textContent = `Unable to load scoreboard: ${error.message}`;
    }
    showMessage('');
  } catch (error) {
    showMessage(error.message || 'Unable to start a new game.');
  }
}

async function checkForCompletion() {
  if (gameCompleted) return;
  if (validateBoardConflicts().size > 0) return;
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

  if (validateBoardConflicts().size > 0) return;
  applyCheckResult(data.incorrect);

  if (data.incorrect.length === 0) {
    const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
    await completeGame(inputs);
  }
  else showMessage('Some cells are incorrect.');
}

function applyCheckResult(incorrectCells) {
  const incorrect = new Set(incorrectCells.map(([row, col]) => row * SIZE + col));
  const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
  inputs.forEach((input, index) => {
    if (input.disabled || input.readOnly) return;
    input.classList.add('cell-checked');
    input.classList.toggle('cell-incorrect', incorrect.has(index));
  });
}

async function completeGame(inputs) {
  if (gameCompleted) return;
  if (validateBoardConflicts().size > 0) return;
  gameCompleted = true;
  clearInterval(timerInterval);
  inputs.forEach((input) => {
    if (!input.disabled) input.readOnly = true;
  });
  const hintButton = document.getElementById('hint');
  if (hintButton) hintButton.disabled = true;

  const level = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  const completionMessage =
    `Congratulations! You solved the ${level} puzzle in ${Scoreboard.formatTime(elapsedSeconds)} with ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}!`;
  showMessage(completionMessage, 'completed');
  document.getElementById('completion-message').textContent = completionMessage;
  try {
    Scoreboard.render();
  } catch (error) {
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = `Unable to load scoreboard: ${error.message}`;
  }
  const completionModal = document.getElementById('completion-modal');
  if (completionModal) completionModal.showModal();
  updateHintButtonState();
}

async function checkSolution() {
  try {
    if (validateBoardConflicts().size > 0) return;
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

    if (validateBoardConflicts().size > 0) return;
    applyCheckResult(data.incorrect);
    const inputs = document.getElementById('sudoku-board').querySelectorAll('input');
    if (data.incorrect.length === 0 && board.every((row) => row.every(Boolean))) {
      await completeGame(inputs);
    } else if (data.incorrect.length > 0) {
      showMessage('Some cells are incorrect.');
    } else {
      showMessage('Keep going — some cells are still empty.');
    }
  } catch (error) {
    if (validateBoardConflicts().size === 0) {
      showMessage(error.message || 'Unable to check the solution.');
    }
  }
}

async function requestHint() {
  if (gameCompleted || hintPending || !gameId || !hasEmptyCells()) {
    updateHintButtonState();
    return;
  }
  hintPending = true;
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
    input.classList.remove('user-entry', 'cell-incorrect', 'cell-checked');
    hintsUsed += 1;
    document.getElementById('hints-used').textContent = String(hintsUsed);
    updateHintButtonState();
    showMessage('');
    await checkForCompletion();
  } catch (error) {
    if (validateBoardConflicts().size === 0) {
      showMessage(error.message || 'Unable to get a hint.');
    }
  } finally {
    hintPending = false;
    updateHintButtonState();
  }
}

function saveScore(event) {
  event.preventDefault();
  const input = document.getElementById('player-name');
  if (!input) return;
  const name = input.value.trim() || 'Player';
  const level = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  try {
    Scoreboard.addScore({
      name,
      time: elapsedSeconds,
      hints: hintsUsed,
      level,
    });
    Scoreboard.render();
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = 'Your score was saved to the Top 10 leaderboard.';
    const completionModal = document.getElementById('completion-modal');
    if (completionModal) completionModal.close();
  } catch (error) {
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = `Unable to save score: ${error.message}`;
  }
}

initializeTheme();

window.addEventListener('load', () => {
  newGame('medium');

  const difficultyModal = document.getElementById('difficulty-modal');
  const newGameButton = document.getElementById('new-game');
  if (newGameButton && difficultyModal) {
    newGameButton.addEventListener('click', () => difficultyModal.showModal());
  }
  document.querySelectorAll('[data-difficulty]').forEach((button) => {
    button.addEventListener('click', () => {
      if (difficultyModal) difficultyModal.close();
      newGame(button.dataset.difficulty);
    });
  });
  const cancelNewGameButton = document.getElementById('cancel-new-game');
  if (cancelNewGameButton && difficultyModal) {
    cancelNewGameButton.addEventListener('click', () => difficultyModal.close());
  }
  if (difficultyModal) {
    difficultyModal.addEventListener('click', (event) => {
      if (event.target === difficultyModal) difficultyModal.close();
    });
  }
  const checkButton = document.getElementById('check-solution');
  if (checkButton) checkButton.addEventListener('click', checkSolution);
  const hintButton = document.getElementById('hint');
  if (hintButton) hintButton.addEventListener('click', requestHint);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  const scoreForm = document.getElementById('score-form');
  if (scoreForm) scoreForm.addEventListener('submit', saveScore);
  try {
    Scoreboard.render();
  } catch (error) {
    const status = document.getElementById('scoreboard-status');
    if (status) status.textContent = `Unable to load scoreboard: ${error.message}`;
  }
});
