/**
 * Game manifest — lightweight metadata used to render the card-grid menu.
 *
 * Only loads id/name/emoji/desc. The actual game module for a given id is
 * lazy-loaded on demand from `./<id>.js` via dynamic `import()`, so the
 * initial menu render never pays the cost of instantiating twelve games.
 */
export const GAMES_MANIFEST = Object.freeze([
  { id: 'pong',      name: 'Sound Pong',    emoji: '🏓', desc: 'Ball bounces trigger notes' },
  { id: 'breakout',  name: 'Brick Beats',   emoji: '🧱', desc: 'Each row = different pitch' },
  { id: 'snake',     name: 'Snake Beats',   emoji: '🐍', desc: 'Growing snake = growing melody' },
  { id: 'invaders',  name: 'Space Synth',   emoji: '👾', desc: 'Shooting gallery synth' },
  { id: 'tetris',    name: 'Tetris Tones',  emoji: '🟦', desc: 'Drops = notes, clears = chords' },
  { id: 'sequencer', name: 'Off The Grid',  emoji: '🎛️', desc: '16-step drum sequencer' },
  { id: 'kong',      name: 'Kong Climb',    emoji: '🦍', desc: 'Barrels = falling arpeggios' },
  { id: 'kongjr',    name: 'Kong Jr',       emoji: '🐒', desc: 'Vine-swinging melodies' },
  { id: 'ghost',     name: 'Ghost Chase',   emoji: '👻', desc: 'Dots = scale, ghosts = tension' },
  { id: 'galaga',    name: 'Galaga Groove', emoji: '🚀', desc: 'Dive bomb sequences' },
  { id: 'frogger',   name: 'Frog Hop',      emoji: '🐸', desc: 'Rhythmic hopping across lanes' },
  { id: 'asteroids', name: 'Deep Spaced',   emoji: '☄️', desc: 'Shooting & collisions = arps' },
]);

/**
 * Lazy-load a game module by id. Returns the module's default factory.
 * Cached per-id after the first import so subsequent launches are free.
 */
const _cache = new Map();
export async function loadGameModule(id) {
  if (!GAMES_MANIFEST.some((g) => g.id === id)) {
    throw new Error(`Unknown game id: ${id}`);
  }
  if (_cache.has(id)) return _cache.get(id);
  const mod = await import(`./${id}.js`);
  const factory = mod.default;
  if (typeof factory !== 'function') {
    throw new Error(`Game module "${id}" has no default export factory`);
  }
  _cache.set(id, factory);
  return factory;
}
