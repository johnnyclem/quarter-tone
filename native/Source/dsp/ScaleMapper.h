#pragma once

#include <array>
#include <string>
#include <vector>

namespace quartertone
{

/**
 * C++ port of `packages/core/src/scale-mapper.ts`. Pure, deterministic,
 * audio-engine-free; given (key, scale, octave) returns an ordered list of
 * note names ("C4", "D#4", …) that `noteAt(index)` indexes into.
 *
 * The two implementations must stay in lockstep — the native Catch2 test
 * suite pins the output against the JS reference across every scale/key.
 */
class ScaleMapper
{
public:
    enum class Scale { Major, Minor, Penta, Blues, Dorian, Mixo, Phrygian };

    ScaleMapper() = default;

    void setKey(int k) noexcept;
    void setScale(Scale s) noexcept    { scale = s; }
    void setOctave(int o) noexcept     { octave = o; }

    int   getKey()    const noexcept   { return key; }
    Scale getScale()  const noexcept   { return scale; }
    int   getOctave() const noexcept   { return octave; }

    /** Return up to n note-name strings spanning three octaves. */
    std::vector<std::string> getNotes(int n = 16) const;

    /** Map arbitrary integer index to a note (wraps with abs + modulo). */
    std::string noteAt(int index, int poolSize = 16) const;

    /** Convert a note name like "A#3" to its MIDI note number. */
    static int noteNameToMidi(const std::string& noteName);

    /** Convenience: resolve an index directly to a MIDI note number. */
    int midiAt(int index, int poolSize = 16) const;

    static constexpr int MinOctave = 2;
    static constexpr int MaxOctave = 6;

private:
    int   key    { 0 };
    Scale scale  { Scale::Major };
    int   octave { 4 };
};

} // namespace quartertone
