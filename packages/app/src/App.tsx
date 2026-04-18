import { ScaleMapper } from '@quarter-tone/core';

import '@/styles/App.css';

export default function App(): JSX.Element {
  const mapper = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
  const notes = mapper.getNotes(8);

  return (
    <main className="app">
      <h1 className="app__title">Quarter Tone</h1>
      <p className="app__subtitle">Vite + React + TypeScript scaffold online.</p>
      <section className="app__scale" aria-label="Current scale preview">
        <code>{notes.join(' · ')}</code>
      </section>
    </main>
  );
}
