#include "FeedbackDelay.h"

namespace quartertone
{

void FeedbackDelay::prepare(double sr, int blockSize, int nChannels)
{
    sampleRate = sr;
    numChannels = nChannels;

    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sr;
    spec.maximumBlockSize = static_cast<juce::uint32>(blockSize);
    spec.numChannels = static_cast<juce::uint32>(nChannels);

    line.reset();
    line.prepare(spec);
    line.setMaximumDelayInSamples(static_cast<int>(sr * 4.0));  // up to 4s
    recomputeDelaySamples();
}

void FeedbackDelay::reset()
{
    line.reset();
}

void FeedbackDelay::setBpm(float b)
{
    bpm = juce::jmax(1.0f, b);
    recomputeDelaySamples();
}

void FeedbackDelay::setFeedback(float amount) { feedback = juce::jlimit(0.0f, 0.98f, amount); }
void FeedbackDelay::setWet(float amount)      { wet      = juce::jlimit(0.0f, 1.0f, amount); }
void FeedbackDelay::setSubdivision(float s)   { subdivision = juce::jmax(1.0f, s); recomputeDelaySamples(); }

void FeedbackDelay::recomputeDelaySamples()
{
    // '8n' = eighth note = quarter / 2. Period(seconds) = (60 / bpm) * 4 / subdivision.
    const float seconds = (60.0f / bpm) * 4.0f / subdivision;
    const float samples = juce::jlimit(1.0f,
        static_cast<float>(sampleRate) * 4.0f,
        seconds * static_cast<float>(sampleRate));
    line.setDelay(samples);
}

void FeedbackDelay::process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples)
{
    const int chans = juce::jmin(numChannels, buffer.getNumChannels());

    for (int i = 0; i < numSamples; ++i)
    {
        for (int ch = 0; ch < chans; ++ch)
        {
            const int sampleIndex = startSample + i;
            const float input = buffer.getSample(ch, sampleIndex);
            const float delayed = line.popSample(ch);
            line.pushSample(ch, input + delayed * feedback);
            buffer.setSample(ch, sampleIndex, input * (1.0f - wet) + delayed * wet);
        }
    }
}

} // namespace quartertone
