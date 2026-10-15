(() => {
  'use strict';
  const engine = window.Classic2048;
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scoreElement = document.getElementById('score');
  const bestElement = document.getElementById('best');
  const status = document.getElementById('status');
  const overlay = document.getElementById('overlay');
  const continueButton = document.getElementById('continue');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'classic-2048-state';
  const bestKey = 'classic-2048-best';
  const colors = {2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e'};
  let board, score = 0, best = 0, continued = false;
  let animation = null, frame = 0, pending = null, pointer = null;
  let size = 500;

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save() {
    try {
      localStorage.setItem(bestKey, String(best));
      localStorage.setItem(storageKey, JSON.stringify({board, score, continued}));
    } catch { /* Storage may be disabled; the game still works. */ }
  }
  function validBoard(value) {
    return Array.isArray(value) && value.length === 4 && value.every(row =>
      Array.isArray(row) && row.length === 4 && row.every(number => Number.isSafeInteger(number) &&
        (number === 0 || (number >= 2 && Number.isInteger(Math.log2(number))))));
  }
  function restore() {
    const storedBest = Number(readStorage(bestKey));
    best = Number.isSafeInteger(storedBest) && storedBest >= 0 ? storedBest : 0;
    try {
      const stored = JSON.parse(readStorage(storageKey));
      if (stored && validBoard(stored.board) && stored.board.flat().some(Boolean) && Number.isSafeInteger(stored.score) && stored.score >= 0) {
        board = stored.board;
        score = stored.score;
        continued = stored.continued === true;
        best = Math.max(best, score);
        return;
      }
    } catch { /* Ignore incomplete or invalid saved games. */ }
    board = engine.newBoard();
  }
  function updateScore(gain = 0) {
    best = Math.max(best, score);
    scoreElement.textContent = score;
    bestElement.textContent = best;
    if (gain) {
      const addition = document.getElementById('score-add');
      addition.textContent = `+${gain}`;
      addition.classList.remove('animate');
      void addition.offsetWidth;
      addition.classList.add('animate');
    }
  }
  function announce() {
    status.textContent = `Score ${score}. Board: ${board.map(row => row.map(value => value || 'empty').join(', ')).join('; ')}`;
  }
  function checkEnd() {
    const won = !continued && board.some(row => row.some(value => value >= 2048));
    const lost = !engine.canMove(board);
    overlay.hidden = !won && !lost;
    overlay.classList.toggle('won', won);
    continueButton.hidden = !won;
    if (!overlay.hidden) {
      document.getElementById('overlay-title').textContent = won ? 'You win!' : 'Game over';
      document.getElementById('overlay-detail').textContent = won ? '2048 reached.' : `Score: ${score}`;
      status.textContent = won ? 'You win! 2048 reached.' : `Game over. Score ${score}.`;
      (won ? continueButton : document.getElementById('retry')).focus({preventScroll: true});
    }
  }
  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }
  function drawTile(value, row, col, scale = 1) {
    if (!value || scale <= 0) return;
    const gap = size * 0.03;
    const cell = (size - gap * 5) / 4;
    const x = gap + col * (cell + gap), y = gap + row * (cell + gap);
    ctx.save();
    ctx.translate(x + cell / 2, y + cell / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = colors[value] || '#3c3a32';
    if (value >= 128) {
      ctx.shadowColor = 'rgba(243, 215, 116, 0.28)';
      ctx.shadowBlur = size * 0.025;
    }
    roundedRect(-cell / 2, -cell / 2, cell, cell, size * 0.006);
    ctx.shadowBlur = 0;
    ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
    const digits = String(value).length;
    const fontSize = cell * (digits <= 2 ? 0.52 : digits === 3 ? 0.43 : digits === 4 ? 0.34 : 0.27);
    ctx.font = `700 ${fontSize}px "Clear Sans", "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 0, cell * 0.035, cell * 0.92);
    ctx.restore();
  }
  function draw(now = performance.now()) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(0, 0, size, size);
    const gap = size * 0.03, cell = (size - gap * 5) / 4;
    ctx.fillStyle = '#cdc1b4';
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      roundedRect(gap + col * (cell + gap), gap + row * (cell + gap), cell, cell, size * 0.006);
    }
    const elapsed = animation ? now - animation.start : 0;
    if (animation && elapsed < 110) {
      const t = 1 - Math.pow(1 - elapsed / 110, 3);
      animation.motions.forEach(tile => drawTile(tile.value,
        tile.row + (tile.toRow - tile.row) * t, tile.col + (tile.toCol - tile.col) * t));
    } else {
      const t = animation ? Math.min(1, (elapsed - 110) / 130) : 1;
      board.forEach((row, r) => row.forEach((value, c) => {
        let scale = 1;
        if (animation && animation.spawn.row === r && animation.spawn.col === c) scale = Math.max(0, t < 0.8 ? t / 0.8 : 1);
        else if (animation && animation.merged.some(tile => tile.row === r && tile.col === c)) scale = 1 + 0.15 * Math.sin(t * Math.PI);
        drawTile(value, r, c, scale);
      }));
    }
    if (animation && elapsed < 240) frame = requestAnimationFrame(draw);
    else if (animation) {
      animation = null;
      frame = 0;
      announce();
      checkEnd();
      const next = pending;
      pending = null;
      if (next) move(next);
    }
  }
  function move(direction) {
    if (!overlay.hidden) return;
    if (animation) { pending = direction; return; }
    const result = engine.move(board, direction);
    if (!result.changed) { checkEnd(); return; }
    board = result.board;
    score += result.score;
    const spawned = engine.spawn(board);
    updateScore(result.score);
    save();
    if (reducedMotion.matches) { draw(); announce(); checkEnd(); }
    else {
      animation = {start: performance.now(), motions: result.motions, merged: result.merged, spawn: spawned};
      frame = requestAnimationFrame(draw);
    }
  }
  function restart() {
    cancelAnimationFrame(frame);
    animation = null;
    pending = null;
    board = engine.newBoard();
    score = 0;
    continued = false;
    overlay.hidden = true;
    document.getElementById('score-add').textContent = '';
    updateScore();
    save();
    draw();
    announce();
    canvas.focus({preventScroll: true});
  }
  function resize() {
    size = canvas.getBoundingClientRect().width;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!animation) draw();
  }
  const directions = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down'};
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable) return;
    const direction = directions[event.key] || directions[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); move(direction); }
  });
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({preventScroll: true});
  });
  canvas.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  canvas.addEventListener('pointercancel', () => { pointer = null; });
  document.getElementById('restart').addEventListener('click', restart);
  document.getElementById('retry').addEventListener('click', restart);
  continueButton.addEventListener('click', () => {
    continued = true;
    overlay.hidden = true;
    save();
    canvas.focus({preventScroll: true});
    checkEnd();
  });
  document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => move(button.dataset.direction)));
  window.addEventListener('resize', resize);
  restore();
  updateScore();
  resize();
  announce();
  checkEnd();
  save();
})();
