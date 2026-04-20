#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

namespace quartertone
{

/**
 * Tempo-synced feedback delay with a wet/dry mix, matching Tone.js
 * FeedbackDelay's '8n' default (an eighth note at the current BPM).
 */
class FeedbackDelay
{
public:
    void prepare(double sampleRate, int blockSize, int numChannels);
    void reset();

    void setBpm(float bpm);
    void setFeedback(float amount);   // 0..1
    void setWet(float amount);        // 0..1
    /** Delay time in beat subdivisions (8 = '8n'). Default 8. */
    void setSubdivision(float subdivision);

    /** Process `buffer` in place over [startSample, startSample + numSamples). */
    void process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples);

private:
    void recomputeDelaySamples();

    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear> line { 192000 };
    double sampleRate   { 44100.0 };
    float  bpm          { 120.0f };
    float  subdivision  { 8.0f };
    float  feedback     { 0.3f };
    float  wet          { 0.3f };
    int    numChannels  { 2 };
};

} // namespace quartertone
