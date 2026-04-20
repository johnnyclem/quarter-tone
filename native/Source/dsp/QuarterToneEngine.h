#pragma once

#include <atomic>

#include <juce_audio_basics/juce_audio_basics.h>

#include "FeedbackDelay.h"
#include "PolySynth.h"
#include "Reverb.h"
#include "ScaleMapper.h"

namespace quartertone
{

/**
 * Native equivalent of @quarter-tone/audio's SynthMapper.
 *
 *   PolySynth ─┐
 *              ├─▶ VolumeGain ─▶ FeedbackDelay ─▶ Reverb ─▶ output
 *   AudioIn ──┘      (audioInSend)
 *
 * Runs wholly on the audio thread. External callers — the MIDI router, the
 * web bridge, the parameter listeners — never touch DSP state directly;
 * they post into lock-free queues that `process()` drains.
 */
class QuarterToneEngine
{
public:
    QuarterToneEngine();

    void prepare(double sampleRate, int blockSize, int numChannels);
    void reset();

    /** Fill output buffer from the synth + FX chain; mixes in audio input. */
    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

    // ---- Real-time-safe setters (call from audio or message thread) ------
    void setWave(PolySynth::Wave w);
    void setAttack(float seconds);
    void setRelease(float seconds);
    void setDelayWet(float amount);
    void setReverbWet(float amount);
    void setVolume(float linearGain);
    void setBpm(float bpm);
    void setAudioInSend(float amount);

    // ---- Scale control (mirrors ScaleMapper) -----------------------------
    void setKey(int k);
    void setScale(ScaleMapper::Scale s);
    void setOctave(int o);

    // ---- Note triggers ---------------------------------------------------
    void playMidi(int midiNote, float velocity);
    void stopMidi(int midiNote);

    /** Play a scale-degree index for the given duration in seconds. */
    void playScaleIndex(int index, double seconds, float velocity);

    /** Resolve a scale-degree index to MIDI — used by the MIDI-out mirror. */
    int midiForIndex(int index) const { return scaleMapper.midiAt(index); }

    void releaseAll();

private:
    ScaleMapper    scaleMapper;
    PolySynth      synth;
    FeedbackDelay  delay;
    Reverb         reverb;

    std::atomic<float> volumeGain  { 0.7f };
    std::atomic<float> audioInSend { 0.0f };

    double sampleRate  { 44100.0 };
    int    numChannels { 2 };
};

} // namespace quartertone
