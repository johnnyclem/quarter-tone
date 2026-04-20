# Quarter-Tone native plugin

Builds `QuarterTone.vst3`, `QuarterTone.component` (AudioUnit), and a
`QuarterTone` standalone host application from a single JUCE + CMake
project. The arcade cabinet UI is reused from `packages/app` via JUCE 8's
`WebBrowserComponent`; the audio engine and MIDI routing are native C++.

## Prerequisites

- CMake ≥ 3.22
- A C++17 toolchain (Xcode CLT on macOS, MSVC ≥ 2019 on Windows, GCC/Clang on Linux)
- Node.js (for the web UI build step)
- JUCE 8 at `native/JUCE/` (git submodule)

## One-time setup

```bash
git submodule update --init --recursive
```

## Build

```bash
# 1. Build the cabinet UI and copy it into Resources/webui/
npm run build:plugin-ui

# 2. Configure and build the plugin
cd native
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j
```

Artefacts land in `native/build/QuarterTone_artefacts/Release/`:

- `VST3/QuarterTone.vst3`
- `AU/QuarterTone.component` (macOS)
- `Standalone/QuarterTone(.app|.exe)`

## Tests

```bash
cd native
cmake --build build --target QuarterToneTests
ctest --test-dir build --output-on-failure
```

The test suite verifies the C++ `ScaleMapper` port matches the JavaScript
reference note-for-note across every scale/key/octave combination.

## Routing

| Bus        | Direction | Notes                                                  |
|------------|-----------|--------------------------------------------------------|
| Audio I/O  | stereo in / stereo out | Input is mixed into the FX chain via the `audioInSend` parameter. |
| MIDI in    | -> synth  | Note-on/off drives the internal poly synth.             |
| MIDI out   | games ->  | Game-emitted notes are mirrored to MIDI out when `midiOutEnabled`. |
