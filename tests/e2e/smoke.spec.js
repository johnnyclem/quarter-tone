// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Tone.js is loaded from a CDN in index.html. For deterministic, offline-safe
 * E2E coverage we replace the CDN response with a lightweight stub that:
 *   - records every triggerAttackRelease call on window.__toneCalls
 *   - exposes window.__toneStarted after Tone.start() resolves
 *   - mimics just enough of the Tone surface the page touches.
 *
 * This lets the test assert "audio plays" by observing synth calls, without
 * requiring real Web Audio hardware or network access to unpkg/cdnjs.
 */
const TONE_STUB = `
(function(){
  const calls = [];
  const started = { value: false };
  window.__toneCalls = calls;
  Object.defineProperty(window, '__toneStarted', {
    get(){ return started.value; },
  });

  function node() {
    const n = {
      wet: { value: 0 },
      volume: { value: 0 },
      toDestination() { return n; },
      connect() { return n; },
      disconnect() { return n; },
      dispose() { return n; },
      set() { return n; },
      triggerAttackRelease(note, dur, time, vel) {
        calls.push({ note, dur, time, vel, t: Date.now() });
        return n;
      },
    };
    return n;
  }

  const Tone = {
    start() { started.value = true; return Promise.resolve(); },
    Reverb: function() { return node(); },
    FeedbackDelay: function() { return node(); },
    Volume: function() { return node(); },
    PolySynth: function() { return node(); },
    Synth: function() { return node(); },
    gainToDb(g) { return 20 * Math.log10(Math.max(1e-6, g)); },
    Transport: { bpm: { value: 120 }, start(){}, stop(){} },
  };
  // Tone.js exports as both default and named on window.
  window.Tone = Tone;
})();
`;

test.beforeEach(async ({ page }) => {
  // Intercept the CDN fetch for Tone.js and return our stub instead. This
  // also decouples the test from network availability.
  await page.route('**/Tone.js*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: TONE_STUB,
    }),
  );

  // Surface any uncaught page errors into the test output.
  page.on('pageerror', (err) => {
    console.error('[pageerror]', err.message);
  });
});

test('title screen \u2192 game launch \u2192 audio plays', async ({ page }) => {
  await page.goto('/');

  // --- Title screen is visible with the INSERT COIN affordance.
  const title = page.locator('#title-screen');
  const insertCoin = page.locator('.insert-coin');
  await expect(title).toBeVisible();
  await expect(title).not.toHaveClass(/hidden/);
  await expect(insertCoin).toBeVisible();
  await expect(insertCoin).toContainText(/INSERT COIN/i);

  // Cabinet is hidden until the coin is inserted.
  const cabinet = page.locator('#cabinet');
  await expect(cabinet).not.toHaveClass(/active/);

  // --- Insert coin. This awaits Tone.start(), hides the title, shows the
  // cabinet + menu, and kicks off the requestAnimationFrame loop.
  await insertCoin.click();

  await expect(title).toHaveClass(/hidden/);
  await expect(cabinet).toHaveClass(/active/);
  await expect(page.locator('#synth-toggle')).toHaveClass(/active/);

  // Menu was populated by buildMenu().
  const gameCards = page.locator('#game-grid .game-card');
  await expect(gameCards.first()).toBeVisible();
  expect(await gameCards.count()).toBeGreaterThanOrEqual(12);

  // Audio engine started (our Tone.start() stub flipped the flag). The page's
  // `audioReady` flag is `let`-scoped inside a classic <script>, so it is
  // intentionally not observable from window.
  await expect.poll(() => page.evaluate(() => window.__toneStarted === true)).toBe(true);

  // --- Launch Sound Pong. Pong's ball bounces off top/bottom walls on its
  // own and calls playNote() for each bounce, so no keyboard input is needed
  // to observe audio output.
  await page.locator('.game-card', { hasText: 'Sound Pong' }).click();
  await expect(page.locator('#game-menu')).toHaveClass(/hidden/);
  await expect(page.locator('#current-game-label')).toHaveText(/SOUND PONG/i);

  // --- Assert audio plays: the synth's triggerAttackRelease is invoked as
  // the game loop ticks. Give the rAF loop enough frames to produce at least
  // one bounce (~1.3s of simulation at 60fps for a default ball).
  await expect
    .poll(() => page.evaluate(() => window.__toneCalls?.length ?? 0), {
      timeout: 8_000,
      intervals: [100, 250, 500],
    })
    .toBeGreaterThan(0);

  // The score counter wiring is also exercised once paddles get involved;
  // the headline smoke guarantee is the note firing above.
});

test('synth drawer toggles after coin insert', async ({ page }) => {
  await page.goto('/');
  await page.locator('.insert-coin').click();

  const drawer = page.locator('#synth-drawer');
  const toggle = page.locator('#synth-toggle');

  await expect(drawer).not.toHaveClass(/open/);
  await toggle.click();
  await expect(drawer).toHaveClass(/open/);
  await toggle.click();
  await expect(drawer).not.toHaveClass(/open/);
});
