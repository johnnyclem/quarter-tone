#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

namespace quartertone
{

/**
 * Wraps juce::dsp::Reverb with a wet/dry knob. Decay matches the Tone.js
 * default (2.5s) via roomSize/damping — not sample-accurate, but close
 * enough for preserving the cabinet's tail character.
 */
class Reverb
{
public:
    void prepare(double sampleRate, int blockSize, int numChannels);
    void reset();

    void setWet(float amount);      // 0..1
    void setDecay(float seconds);   // 0..10 (approximate)

    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

private:
    void updateParams();

    juce::dsp::Reverb reverb;
    juce::dsp::Reverb::Parameters params;
    int numChannels { 2 };
};

} // namespace quartertone
