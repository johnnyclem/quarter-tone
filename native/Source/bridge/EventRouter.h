#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

namespace quartertone
{

class QuarterToneEngine;
class MidiRouter;

/**
 * Decodes JSON messages posted from the React cabinet and dispatches them
 * to the engine / MIDI router / APVTS. Mirrors `plugin-contract.ts`.
 *
 *   JS → { kind: 'note',  index: int, duration?, velocity? }   → engine + MIDI out
 *   JS → { kind: 'chord', indices: int[], duration?, velocity? } → engine + MIDI out
 *   JS → { kind: 'param', id: string, value: number }          → APVTS
 *   JS → { kind: 'ready' }                                     → push full param state back
 */
class EventRouter
{
public:
    EventRouter(QuarterToneEngine& engine,
                MidiRouter& midi,
                juce::AudioProcessorValueTreeState& apvts,
                std::function<void(const juce::String&)> sendToJs);

    /** Called on the message thread from WebBridge::onMessage. */
    void handleFromJs(const juce::String& json);

    /** Push one param's current value to JS (used on load + after automation). */
    void sendParam(const juce::String& paramId);

    /** Push every param's current value to JS. */
    void sendAllParams();

private:
    QuarterToneEngine&                 engine;
    MidiRouter&                        midi;
    juce::AudioProcessorValueTreeState& apvts;
    std::function<void(const juce::String&)> sendToJs;

    void playIndex(int index, const juce::var& durationVar, const juce::var& velocityVar);
};

} // namespace quartertone
