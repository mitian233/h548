/* Pure 2048 rules, shared by the browser and Node tests. */
(function (root) {
  'use strict';
  function move(input, direction) {
    const board = Array.from({length: 4}, () => [0, 0, 0, 0]);
    const motions = [];
    const merged = [];
    let score = 0;
    const coordinate = (line, index) => {
      if (direction === 'right') return [line, 3 - index];
      if (direction === 'up') return [index, line];
      if (direction === 'down') return [3 - index, line];
      return [line, index];
    };
    for (let line = 0; line < 4; line++) {
      const tiles = [];
      for (let index = 0; index < 4; index++) {
        const [row, col] = coordinate(line, index);
        if (input[row][col]) tiles.push({row, col, value: input[row][col]});
      }
      let destination = 0;
      for (let index = 0; index < tiles.length; index++) {
        const tile = tiles[index];
        const [row, col] = coordinate(line, destination++);
        const pair = tiles[index + 1];
        motions.push({...tile, toRow: row, toCol: col});
        if (pair && pair.value === tile.value) {
          board[row][col] = tile.value * 2;
          score += board[row][col];
          merged.push({row, col});
          motions.push({...pair, toRow: row, toCol: col});
          index++;
        } else board[row][col] = tile.value;
      }
    }
    const changed = board.some((row, r) => row.some((value, c) => value !== input[r][c]));
    return {board, score, changed, motions, merged};
  }
  function canMove(board) {
    return board.some((row, r) => row.some((value, c) => !value ||
      (c < 3 && value === board[r][c + 1]) || (r < 3 && value === board[r + 1][c])));
  }
  function spawn(board, random = Math.random) {
    const empty = [];
    board.forEach((row, r) => row.forEach((value, c) => { if (!value) empty.push([r, c]); }));
    if (!empty.length) return null;
    const [row, col] = empty[Math.floor(random() * empty.length)];
    const value = random() < 0.9 ? 2 : 4;
    board[row][col] = value;
    return {row, col, value};
  }
  function newBoard(random = Math.random) {
    const board = Array.from({length: 4}, () => [0, 0, 0, 0]);
    spawn(board, random);
    spawn(board, random);
    return board;
  }
  const api = {move, canMove, spawn, newBoard};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Classic2048 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
