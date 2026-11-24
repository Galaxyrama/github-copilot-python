// Persistent local scoreboard for completed games.
(() => {
  const STORAGE_KEY = 'sudokuTop10Scores';
  const MAX_SCORES = 10;

  function getScores() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];

    const scores = JSON.parse(stored);
    if (
      !Array.isArray(scores)
      || scores.some((score) => (
        !score
        || typeof score.name !== 'string'
        || !Number.isInteger(score.timeSeconds)
        || typeof score.level !== 'string'
        || !Number.isInteger(score.hints)
      ))
    ) {
      throw new Error('Saved scoreboard data is invalid.');
    }
    return scores;
  }

  function qualifies(timeSeconds) {
    const scores = getScores();
    return scores.length < MAX_SCORES
      || timeSeconds < scores[MAX_SCORES - 1].timeSeconds;
  }

  function addScore(score) {
    const scores = getScores();
    scores.push(score);
    scores.sort((first, second) => first.timeSeconds - second.timeSeconds);
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
    const scores = getScores();
    body.replaceChildren();

    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      [
        index + 1,
        score.name,
        formatTime(score.timeSeconds),
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

  window.Scoreboard = { addScore, formatTime, qualifies, render };
})();
