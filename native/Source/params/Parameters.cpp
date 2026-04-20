#include "Parameters.h"

namespace quartertone
{

using APVTS = juce::AudioProcessorValueTreeState;

static std::unique_ptr<juce::AudioParameterFloat> makeFloat(
    const juce::String& id,
    const juce::String& name,
    juce::NormalisableRange<float> range,
    float defaultValue)
{
    return std::make_unique<juce::AudioParameterFloat>(
        juce::ParameterID { id, 1 }, name, range, defaultValue);
}

APVTS::ParameterLayout createParameterLayout()
{
    APVTS::ParameterLayout layout;

    layout.add(std::make_unique<juce::AudioParameterInt>(
        juce::ParameterID { ParamIds::key, 1 }, "Key", 0, 11, 0));

    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { ParamIds::scale, 1 }, "Scale", scaleChoices, 0));

    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { ParamIds::wave, 1 }, "Wave", waveChoices, 0));

    layout.add(std::make_unique<juce::AudioParameterChoice>(
        juce::ParameterID { ParamIds::arp, 1 }, "Arp", arpChoices, 0));

    layout.add(std::make_unique<juce::AudioParameterInt>(
        juce::ParameterID { ParamIds::octave, 1 }, "Octave", 2, 6, 4));

    layout.add(makeFloat(ParamIds::attack,     "Attack",
        juce::NormalisableRange<float> { 0.005f, 0.2f, 0.0f, 0.3f }, 0.02f));

    layout.add(makeFloat(ParamIds::release,    "Release",
        juce::NormalisableRange<float> { 0.1f, 1.2f, 0.0f, 0.4f }, 0.3f));

    layout.add(makeFloat(ParamIds::delayWet,   "Delay Wet",
        juce::NormalisableRange<float> { 0.0f, 1.0f }, 0.3f));

    layout.add(makeFloat(ParamIds::reverbWet,  "Reverb Wet",
        juce::NormalisableRange<float> { 0.0f, 1.0f }, 0.4f));

    layout.add(makeFloat(ParamIds::volume,     "Volume",
        juce::NormalisableRange<float> { 0.0f, 1.0f }, 0.7f));

    layout.add(makeFloat(ParamIds::bpm,        "BPM",
        juce::NormalisableRange<float> { 60.0f, 200.0f, 1.0f }, 120.0f));

    layout.add(makeFloat(ParamIds::audioInSend, "Audio In Send",
        juce::NormalisableRange<float> { 0.0f, 1.0f }, 0.0f));

    layout.add(std::make_unique<juce::AudioParameterBool>(
        juce::ParameterID { ParamIds::midiOutEnabled, 1 },
        "MIDI Out Enabled", true));

    return layout;
}

} // namespace quartertone
