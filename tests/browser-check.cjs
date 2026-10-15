// Run through: playwright-cli -s=2048 run-code --filename=tests/browser-check.cjs
async (page) => {
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const seed = async (board, score = 0, continued = false) => {
    await page.evaluate(({board, score, continued}) => localStorage.setItem('classic-2048-state', JSON.stringify({board, score, continued})), {board, score, continued});
    await page.reload();
  };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('classic-2048-state')));
  const empty = () => Array.from({length: 4}, () => [0, 0, 0, 0]);
  const wait = () => page.waitForTimeout(300);
  const errors = [];
  const browser = page.context().browser();
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({width: 1280, height: 1000});
  let board = empty(); board[0] = [2, 2, 2, 2];
  await seed(board);
  await page.keyboard.press('ArrowLeft'); await wait();
  let result = await state();
  assert(result.board[0][0] === 4 && result.board[0][1] === 4 && result.score === 8, 'keyboard merge and score');
  assert(result.board.flat().filter(Boolean).length === 3, 'exactly one tile spawned');
  await page.reload();
  assert(JSON.stringify(await state()) === JSON.stringify(result), 'reload restores exact game');
  board = empty(); board[0] = [2, 4, 0, 0];
  await seed(board);
  await page.keyboard.press('ArrowLeft'); await wait();
  assert(JSON.stringify((await state()).board) === JSON.stringify(board), 'invalid move does not spawn');
  for (let i = 0; i < 20; i++) await page.keyboard.press(['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'][i % 4]);
  await page.waitForTimeout(650);
  result = await state();
  assert(result.board.length === 4 && result.board.every(row => row.length === 4), 'rapid input keeps valid board');
  board = empty(); board[0] = [1024, 1024, 0, 0];
  await seed(board);
  await page.keyboard.press('ArrowLeft'); await wait();
  assert(await page.locator('#overlay').isVisible(), 'win overlay appears');
  assert((await page.locator('#overlay-title').textContent()) === 'You win!', 'win message');
  await page.locator('#continue').click();
  assert(!(await page.locator('#overlay').isVisible()) && (await state()).continued, 'continue works');
  await seed([[2,4,2,4],[4,2,4,2],[2,4,2,4],[4,2,4,2]], 100);
  assert((await page.locator('#overlay-title').textContent()) === 'Game over', 'loss detection');
  await page.locator('#retry').click();
  assert((await state()).score === 0 && (await state()).board.flat().filter(Boolean).length === 2, 'retry resets game');
  board = empty(); board[0] = [2, 4, 8, 16]; board[1] = [4, 8, 16, 32]; board[2] = [8, 16, 64, 128]; board[3] = [0, 2, 256, 512];
  await seed(board, 1820);
  await page.screenshot({path: 'tests/desktop.png', fullPage: true});
  await page.setViewportSize({width: 375, height: 812});
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile has no horizontal overflow');
  board = empty(); board[0] = [2, 2, 0, 0]; await seed(board);
  const rect = await page.locator('#board').boundingBox();
  await page.mouse.move(rect.x + rect.width - 30, rect.y + 50);
  await page.mouse.down();
  await page.mouse.move(rect.x + 30, rect.y + 50, {steps: 8});
  await page.mouse.up(); await wait();
  assert((await state()).score === 4, 'pointer swipe merges');
  await page.locator('[data-direction="down"]').click(); await wait();
  assert((await state()).board[3].some(Boolean), 'mobile direction buttons');
  await page.screenshot({path: 'tests/mobile.png', fullPage: true});
  await page.evaluate(() => localStorage.setItem('classic-2048-state', '{broken'));
  await page.reload();
  assert((await state()).board.flat().filter(Boolean).length === 2, 'corrupt save recovers');
  const isolated = await browser.newContext({viewport: {width: 375, height: 812}});
  const noStorage = await isolated.newPage();
  try {
    await noStorage.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('disabled'); };
      Storage.prototype.setItem = () => { throw new Error('disabled'); };
    });
    await noStorage.goto('http://127.0.0.1:2048');
    await noStorage.keyboard.press('ArrowDown');
    await noStorage.waitForTimeout(300);
    assert(!(await noStorage.locator('#overlay').isVisible()), 'storage disabled still playable');
  } finally {
    await isolated.close();
  }
  assert(errors.length === 0, `browser errors: ${errors.join(', ')}`);
  return {passed: 17, errors, screenshots: ['tests/desktop.png', 'tests/mobile.png']};
}
