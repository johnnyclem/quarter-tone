#include "PluginProcessor.h"

#include "PluginEditor.h"
#include "bridge/EventRouter.h"

namespace quartertone
{

juce::AudioProcessor::BusesProperties QuarterToneProcessor::makeBuses()
{
    // Instrument plugins in VST3/AU accept an (optional) stereo input that
    // DAWs expose as a sidechain. We declare it so users can route audio
    // through the Quarter-Tone FX chain alongside the internal synth.
    return BusesProperties()
        .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
        .withOutput ("Output", juce::AudioChannelSet::stereo(), true);
}

QuarterToneProcessor::QuarterToneProcessor()
    : juce::AudioProcessor(makeBuses())
    , apvts(*this, nullptr, "QuarterTone", createParameterLayout())
{
    static const std::array<const char*, 13> ids {
        ParamIds::key, ParamIds::scale, ParamIds::wave, ParamIds::arp,
        ParamIds::octave, ParamIds::attack, ParamIds::release,
        ParamIds::delayWet, ParamIds::reverbWet, ParamIds::volume,
        ParamIds::bpm, ParamIds::audioInSend, ParamIds::midiOutEnabled
    };
    for (const char* id : ids) apvts.addParameterListener(id, this);
}

QuarterToneProcessor::~QuarterToneProcessor()
{
    static const std::array<const char*, 13> ids {
        ParamIds::key, ParamIds::scale, ParamIds::wave, ParamIds::arp,
        ParamIds::octave, ParamIds::attack, ParamIds::release,
        ParamIds::delayWet, ParamIds::reverbWet, ParamIds::volume,
        ParamIds::bpm, ParamIds::audioInSend, ParamIds::midiOutEnabled
    };
    for (const char* id : ids) apvts.removeParameterListener(id, this);
}

void QuarterToneProcessor::setEventRouter(std::unique_ptr<EventRouter> r)
{
    eventRouter = std::move(r);
}

bool QuarterToneProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
    const auto out = layouts.getMainOutputChannelSet();
    if (out != juce::AudioChannelSet::mono() && out != juce::AudioChannelSet::stereo())
        return false;

    const auto in = layouts.getMainInputChannelSet();
    if (! in.isDisabled() && in != juce::AudioChannelSet::mono() && in != juce::AudioChannelSet::stereo())
        return false;

    return true;
}

void QuarterToneProcessor::prepareToPlay(double sr, int blockSize)
{
    const int nChans = juce::jmax(getTotalNumOutputChannels(), 1);
    engine.prepare(sr, blockSize, nChans);
    midi.setSampleRate(sr);
    applyAllParams();
}

void QuarterToneProcessor::releaseResources()
{
    engine.reset();
}

void QuarterToneProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiBuf)
{
    juce::ScopedNoDenormals noDenormals;

    const int totalIn  = getTotalNumInputChannels();
    const int totalOut = getTotalNumOutputChannels();
    for (int ch = totalIn; ch < totalOut; ++ch)
        buffer.clear(ch, 0, buffer.getNumSamples());

    midi.process(midiBuf, buffer.getNumSamples());
    engine.process(buffer, 0, buffer.getNumSamples());
}

juce::AudioProcessorEditor* QuarterToneProcessor::createEditor()
{
    return new QuarterToneEditor(*this);
}

void QuarterToneProcessor::getStateInformation(juce::MemoryBlock& dest)
{
    juce::MemoryOutputStream os(dest, false);
    apvts.state.writeToStream(os);
}

void QuarterToneProcessor::setStateInformation(const void* data, int size)
{
    auto tree = juce::ValueTree::readFromData(data, static_cast<size_t>(size));
    if (tree.isValid()) apvts.replaceState(tree);
    applyAllParams();
}

void QuarterToneProcessor::parameterChanged(const juce::String& id, float newValue)
{
    if (id == ParamIds::wave)
    {
        static const std::array<PolySynth::Wave, 4> table {
            PolySynth::Wave::Triangle, PolySynth::Wave::Sine,
            PolySynth::Wave::Square,   PolySynth::Wave::Sawtooth
        };
        const int idx = juce::jlimit(0, 3, static_cast<int>(newValue));
        engine.setWave(table[static_cast<size_t>(idx)]);
    }
    else if (id == ParamIds::scale)
    {
        static const std::array<ScaleMapper::Scale, 7> table {
            ScaleMapper::Scale::Major,    ScaleMapper::Scale::Minor,
            ScaleMapper::Scale::Penta,    ScaleMapper::Scale::Blues,
            ScaleMapper::Scale::Dorian,   ScaleMapper::Scale::Mixo,
            ScaleMapper::Scale::Phrygian
        };
        const int idx = juce::jlimit(0, 6, static_cast<int>(newValue));
        engine.setScale(table[static_cast<size_t>(idx)]);
    }
    else if (id == ParamIds::key)            engine.setKey(static_cast<int>(newValue));
    else if (id == ParamIds::octave)         engine.setOctave(static_cast<int>(newValue));
    else if (id == ParamIds::attack)         engine.setAttack(newValue);
    else if (id == ParamIds::release)        engine.setRelease(newValue);
    else if (id == ParamIds::delayWet)       engine.setDelayWet(newValue);
    else if (id == ParamIds::reverbWet)      engine.setReverbWet(newValue);
    else if (id == ParamIds::volume)         engine.setVolume(newValue);
    else if (id == ParamIds::bpm)            engine.setBpm(newValue);
    else if (id == ParamIds::audioInSend)    engine.setAudioInSend(newValue);
    else if (id == ParamIds::midiOutEnabled) midi.setMidiOutEnabled(newValue > 0.5f);

    if (eventRouter != nullptr) eventRouter->sendParam(id);
}

void QuarterToneProcessor::applyAllParams()
{
    static const std::array<const char*, 13> ids {
        ParamIds::key, ParamIds::scale, ParamIds::wave, ParamIds::arp,
        ParamIds::octave, ParamIds::attack, ParamIds::release,
        ParamIds::delayWet, ParamIds::reverbWet, ParamIds::volume,
        ParamIds::bpm, ParamIds::audioInSend, ParamIds::midiOutEnabled
    };
    for (const char* id : ids)
    {
        if (auto* raw = apvts.getRawParameterValue(id))
            parameterChanged(id, raw->load());
    }
}

} // namespace quartertone

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new quartertone::QuarterToneProcessor();
}
