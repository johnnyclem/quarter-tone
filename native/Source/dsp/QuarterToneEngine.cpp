#include "QuarterToneEngine.h"

namespace quartertone
{

QuarterToneEngine::QuarterToneEngine() = default;

void QuarterToneEngine::prepare(double sr, int blockSize, int nChannels)
{
    sampleRate = sr;
    numChannels = nChannels;
    synth.prepare(sr, blockSize, nChannels);
    delay.prepare(sr, blockSize, nChannels);
    reverb.prepare(sr, blockSize, nChannels);
}

void QuarterToneEngine::reset()
{
    synth.reset();
    delay.reset();
    reverb.reset();
}

void QuarterToneEngine::process(juce::AudioBuffer<float>& buffer,
                                int startSample,
                                int numSamples)
{
    // Buffer enters with audio in on it; scale by `audioInSend` then layer
    // the synth voices on top. Downstream FX then colour the sum.
    const float send = audioInSend.load(std::memory_order_relaxed);
    if (send != 1.0f)
    {
        for (int ch = 0; ch < juce::jmin(numChannels, buffer.getNumChannels()); ++ch)
            buffer.applyGain(ch, startSample, numSamples, send);
    }

    synth.renderNextBlock(buffer, startSample, numSamples);
    delay.process(buffer, startSample, numSamples);
    reverb.process(buffer, startSample, numSamples);

    const float g = volumeGain.load(std::memory_order_relaxed);
    for (int ch = 0; ch < juce::jmin(numChannels, buffer.getNumChannels()); ++ch)
        buffer.applyGain(ch, startSample, numSamples, g);
}

void QuarterToneEngine::setWave(PolySynth::Wave w)      { synth.setWave(w); }
void QuarterToneEngine::setAttack(float s)              { synth.setAttack(s); }
void QuarterToneEngine::setRelease(float s)             { synth.setRelease(s); }
void QuarterToneEngine::setDelayWet(float a)            { delay.setWet(a); }
void QuarterToneEngine::setReverbWet(float a)           { reverb.setWet(a); }
void QuarterToneEngine::setVolume(float linearGain)     { volumeGain.store(linearGain); }
void QuarterToneEngine::setBpm(float bpm)               { delay.setBpm(bpm); }
void QuarterToneEngine::setAudioInSend(float a)         { audioInSend.store(a); }

void QuarterToneEngine::setKey(int k)                   { scaleMapper.setKey(k); }
void QuarterToneEngine::setScale(ScaleMapper::Scale s)  { scaleMapper.setScale(s); }
void QuarterToneEngine::setOctave(int o)                { scaleMapper.setOctave(o); }

void QuarterToneEngine::playMidi(int midiNote, float velocity)
{
    synth.noteOn(midiNote, velocity);
}

void QuarterToneEngine::stopMidi(int midiNote)
{
    synth.noteOff(midiNote);
}

void QuarterToneEngine::playScaleIndex(int index, double seconds, float velocity)
{
    const int midi = scaleMapper.midiAt(index);
    if (midi < 0 || midi > 127) return;
    synth.triggerAttackRelease(midi, velocity, seconds);
}

void QuarterToneEngine::releaseAll()
{
    synth.releaseAll();
}

} // namespace quartertone
