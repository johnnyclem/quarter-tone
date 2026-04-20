#include "Reverb.h"

namespace quartertone
{

void Reverb::prepare(double sr, int blockSize, int nChannels)
{
    numChannels = nChannels;
    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sr;
    spec.maximumBlockSize = static_cast<juce::uint32>(blockSize);
    spec.numChannels = static_cast<juce::uint32>(nChannels);
    reverb.prepare(spec);
    params.roomSize = 0.6f;
    params.damping = 0.35f;
    params.wetLevel = 0.4f;
    params.dryLevel = 0.6f;
    params.width = 1.0f;
    params.freezeMode = 0.0f;
    updateParams();
}

void Reverb::reset()
{
    reverb.reset();
}

void Reverb::setWet(float amount)
{
    amount = juce::jlimit(0.0f, 1.0f, amount);
    params.wetLevel = amount;
    params.dryLevel = 1.0f - amount;
    updateParams();
}

void Reverb::setDecay(float seconds)
{
    // Map 0..10s → roomSize 0..0.95 (roughly logarithmic).
    const float t = juce::jlimit(0.0f, 10.0f, seconds) / 10.0f;
    params.roomSize = juce::jlimit(0.1f, 0.95f, 0.3f + 0.65f * t);
    updateParams();
}

void Reverb::updateParams()
{
    reverb.setParameters(params);
}

void Reverb::process(juce::AudioBuffer<float>& buffer, int startSample, int numSamples)
{
    juce::dsp::AudioBlock<float> block (buffer);
    auto slice = block.getSubBlock(static_cast<size_t>(startSample),
                                   static_cast<size_t>(numSamples));
    juce::dsp::ProcessContextReplacing<float> ctx (slice);
    reverb.process(ctx);
}

} // namespace quartertone
