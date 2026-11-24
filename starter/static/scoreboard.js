// Persistent local scoreboard for completed games.
(() => {
  const STORAGE_KEY = 'sudokuTop10Scores';
  const MAX_SCORES = 10;

  function getScores() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];

    const savedScores = JSON.parse(stored);
    if (
      !Array.isArray(savedScores)
      || savedScores.some((score) => (
        !score
        || typeof score.name !== 'string'
        || !Number.isInteger(score.time ?? score.timeSeconds)
        || typeof score.level !== 'string'
        || !Number.isInteger(score.hints)
      ))
    ) {
      throw new Error('Saved scoreboard data is invalid.');
    }
    return savedScores.map((score) => ({
      name: score.name,
      time: score.time ?? score.timeSeconds,
      hints: score.hints,
      level: score.level,
    }));
  }

  function addScore(score) {
    const scores = getScores();
    scores.push(score);
    scores.sort((first, second) => first.time - second.time);
    const topScores = scores.slice(0, MAX_SCORES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
    return topScores;
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function render() {
    const body = document.getElementById('scoreboard-body');
    body.replaceChildren();
    const scores = getScores()
      .sort((first, second) => first.time - second.time)
      .slice(0, MAX_SCORES);

    if (scores.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No scores yet.';
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      [
        index + 1,
        score.name,
        formatTime(score.time),
        score.level,
        score.hints,
      ].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  window.Scoreboard = { addScore, formatTime, render };
})();
