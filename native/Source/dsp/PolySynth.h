#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

namespace quartertone
{

/**
 * Minimal polyphonic oscillator synth with per-voice ADSR — the native
 * equivalent of Tone.js's PolySynth(Synth) configured by SynthMapper.
 *
 * Waveforms: triangle, sine, square, sawtooth (selectable at runtime).
 * Voice stealing: oldest-first when all voices are busy.
 */
class PolySynth
{
public:
    enum class Wave { Triangle, Sine, Square, Sawtooth };

    void prepare(double sampleRate, int blockSize, int numChannels);
    void reset();

    void setWave(Wave w);
    void setAttack(float seconds);
    void setRelease(float seconds);

    /** Trigger a MIDI note (0..127). velocity is 0..1. */
    void noteOn(int midiNote, float velocity);
    void noteOff(int midiNote);

    /** Timed trigger — auto-noteOff after `seconds`. */
    void triggerAttackRelease(int midiNote, float velocity, double seconds);

    /** Release every held voice immediately. */
    void releaseAll();

    /** Render one block — adds to `buffer` (does not overwrite). */
    void renderNextBlock(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

    static constexpr int MaxVoices = 16;

private:
    struct Voice
    {
        int   midiNote    { -1 };
        bool  active      { false };
        bool  releasing   { false };
        float phase       { 0.0f };
        float phaseInc    { 0.0f };
        float velocity    { 0.0f };
        int   samplesLeft { 0 };     // 0 = manually-held (wait for noteOff)
        juce::ADSR adsr;
        std::uint64_t startedAtSample { 0 };
    };

    Voice* findFreeVoice();
    float  oscillator(Voice& v) const;

    std::array<Voice, MaxVoices> voices;
    juce::ADSR::Parameters adsrParams { 0.02f, 0.2f, 0.3f, 0.3f };
    Wave   wave         { Wave::Triangle };
    double sampleRate   { 44100.0 };
    std::uint64_t age   { 0 };
};

} // namespace quartertone
