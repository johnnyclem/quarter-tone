#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

namespace quartertone
{

/**
 * Stable parameter IDs. These strings must match the `ParamId` union in
 * `packages/core/src/plugin/plugin-contract.ts` exactly — DAW automation,
 * persisted presets, and the JS bridge all key off them.
 */
namespace ParamIds
{
    inline constexpr const char* key             = "key";
    inline constexpr const char* scale           = "scale";
    inline constexpr const char* wave            = "wave";
    inline constexpr const char* arp             = "arp";
    inline constexpr const char* octave          = "octave";
    inline constexpr const char* attack          = "attack";
    inline constexpr const char* release         = "release";
    inline constexpr const char* delayWet        = "delayWet";
    inline constexpr const char* reverbWet       = "reverbWet";
    inline constexpr const char* volume          = "volume";
    inline constexpr const char* bpm             = "bpm";
    inline constexpr const char* audioInSend     = "audioInSend";
    inline constexpr const char* midiOutEnabled  = "midiOutEnabled";
}

/** Enumerated param choices — must stay aligned with plugin-contract.ts. */
inline const juce::StringArray scaleChoices {
    "Major", "Minor", "Penta", "Blues", "Dorian", "Mixo", "Phrygian"
};

inline const juce::StringArray waveChoices {
    "triangle", "sine", "square", "sawtooth"
};

inline const juce::StringArray arpChoices {
    "Up", "Down", "Bounce", "Random"
};

/** Build the APVTS parameter layout. */
juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

} // namespace quartertone
