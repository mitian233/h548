// Run through: playwright-cli -s=2048 run-code --filename=tests/layout-check.cjs
async (page) => {
  // Use an isolated context so disabled-storage checks cannot affect this run.
  const context = await page.context().browser().newContext();
  const game = await context.newPage();
  const results = [];
  try {
    await game.goto('http://127.0.0.1:2048');
    for (const [width, height] of [[1440,900], [1366,768], [1024,600], [800,600], [600,400], [375,812], [390,664], [320,568], [320,480], [812,375], [667,320], [568,320]]) {
      await game.setViewportSize({width, height});
      await game.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await game.evaluate(() => {
        const selectors = ['.heading', '.toolbar', '.board-wrap', '#restart', ...([...document.querySelectorAll('.touch-controls button')].map(button => `[data-direction="${button.dataset.direction}"]`))];
        const clipped = selectors.filter(selector => {
          const element = document.querySelector(selector);
          if (!element.getClientRects().length) return false;
          const rect = element.getBoundingClientRect();
          return rect.x < 0 || rect.y < 0 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1;
        });
        const rect = document.querySelector('#board').getBoundingClientRect();
        return {
          clipped,
          scroll: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
          square: Math.abs(rect.width - rect.height) < 1,
          boardSize: Math.round(rect.width),
          english: document.documentElement.lang === 'en' && !/[\u3400-\u9fff]/u.test(document.body.textContent),
        };
      });
      if (layout.scroll || layout.clipped.length || !layout.square || !layout.english) throw new Error(`${width}x${height}: ${JSON.stringify(layout)}`);
      await game.mouse.wheel(0, 500);
      if (await game.evaluate(() => scrollY !== 0)) throw new Error(`Wheel scrolled at ${width}x${height}`);
      results.push({viewport: `${width}x${height}`, board: layout.boardSize, fits: true});
    }
    await game.setViewportSize({width: 1366, height: 768});
    await game.screenshot({path: 'tests/layout-desktop.png'});
    await game.setViewportSize({width: 375, height: 812});
    await game.screenshot({path: 'tests/layout-mobile.png'});
    await game.setViewportSize({width: 667, height: 320});
    await game.screenshot({path: 'tests/layout-landscape.png'});
    return {passed: results.length, results};
  } finally {
    await context.close();
  }
}
