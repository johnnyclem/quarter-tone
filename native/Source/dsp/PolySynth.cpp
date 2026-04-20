#include "PolySynth.h"

#include <cmath>

namespace quartertone
{

void PolySynth::prepare(double sr, int /*blockSize*/, int /*numChannels*/)
{
    sampleRate = sr;
    for (auto& v : voices)
    {
        v.adsr.setSampleRate(sr);
        v.adsr.setParameters(adsrParams);
    }
    reset();
}

void PolySynth::reset()
{
    for (auto& v : voices)
    {
        v.active = false;
        v.releasing = false;
        v.phase = 0.0f;
        v.samplesLeft = 0;
        v.adsr.reset();
    }
    age = 0;
}

void PolySynth::setWave(Wave w) { wave = w; }

void PolySynth::setAttack(float seconds)
{
    adsrParams.attack = seconds;
    for (auto& v : voices) v.adsr.setParameters(adsrParams);
}

void PolySynth::setRelease(float seconds)
{
    adsrParams.release = seconds;
    for (auto& v : voices) v.adsr.setParameters(adsrParams);
}

PolySynth::Voice* PolySynth::findFreeVoice()
{
    Voice* stolen = nullptr;
    std::uint64_t oldest = UINT64_MAX;

    for (auto& v : voices)
    {
        if (! v.active) return &v;
        if (v.startedAtSample < oldest)
        {
            oldest = v.startedAtSample;
            stolen = &v;
        }
    }
    return stolen;
}

void PolySynth::noteOn(int midiNote, float velocity)
{
    auto* v = findFreeVoice();
    if (v == nullptr) return;

    v->midiNote = midiNote;
    v->active = true;
    v->releasing = false;
    v->phase = 0.0f;
    v->velocity = juce::jlimit(0.0f, 1.0f, velocity);
    v->samplesLeft = 0;
    v->startedAtSample = ++age;

    const double freq = 440.0 * std::pow(2.0, (midiNote - 69) / 12.0);
    v->phaseInc = static_cast<float>(freq / sampleRate);

    v->adsr.setParameters(adsrParams);
    v->adsr.noteOn();
}

void PolySynth::noteOff(int midiNote)
{
    for (auto& v : voices)
    {
        if (v.active && v.midiNote == midiNote && ! v.releasing)
        {
            v.adsr.noteOff();
            v.releasing = true;
        }
    }
}

void PolySynth::triggerAttackRelease(int midiNote, float velocity, double seconds)
{
    noteOn(midiNote, velocity);
    // Arm auto-release after `seconds` samples. The render loop counts down
    // `samplesLeft`; 0 means "manual hold".
    auto* hit = static_cast<Voice*>(nullptr);
    std::uint64_t newest = 0;
    for (auto& v : voices)
    {
        if (v.active && v.midiNote == midiNote && ! v.releasing && v.startedAtSample >= newest)
        {
            newest = v.startedAtSample;
            hit = &v;
        }
    }
    if (hit != nullptr)
        hit->samplesLeft = juce::jmax(1, static_cast<int>(seconds * sampleRate));
}

void PolySynth::releaseAll()
{
    for (auto& v : voices)
    {
        if (v.active)
        {
            v.adsr.noteOff();
            v.releasing = true;
        }
    }
}

float PolySynth::oscillator(Voice& v) const
{
    const float p = v.phase;
    switch (wave)
    {
        case Wave::Sine:
            return std::sin(p * juce::MathConstants<float>::twoPi);
        case Wave::Square:
            return p < 0.5f ? 1.0f : -1.0f;
        case Wave::Sawtooth:
            return 2.0f * p - 1.0f;
        case Wave::Triangle:
        default:
            return 4.0f * std::fabs(p - 0.5f) - 1.0f;
    }
}

void PolySynth::renderNextBlock(juce::AudioBuffer<float>& buffer,
                                int startSample,
                                int numSamples)
{
    const int numChannels = buffer.getNumChannels();
    if (numChannels == 0 || numSamples <= 0) return;

    for (auto& v : voices)
    {
        if (! v.active) continue;

        for (int i = 0; i < numSamples; ++i)
        {
            if (v.samplesLeft > 0)
            {
                if (--v.samplesLeft == 0 && ! v.releasing)
                {
                    v.adsr.noteOff();
                    v.releasing = true;
                }
            }

            const float env = v.adsr.getNextSample();
            const float s   = oscillator(v) * env * v.velocity * 0.4f; // voiceDb ≈ -8

            for (int ch = 0; ch < numChannels; ++ch)
                buffer.addSample(ch, startSample + i, s);

            v.phase += v.phaseInc;
            if (v.phase >= 1.0f) v.phase -= 1.0f;

            if (! v.adsr.isActive())
            {
                v.active = false;
                v.releasing = false;
                break;
            }
        }
    }
}

} // namespace quartertone
