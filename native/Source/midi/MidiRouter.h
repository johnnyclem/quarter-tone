#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

namespace quartertone
{

class QuarterToneEngine;

/**
 * Bridges the plugin's MIDI bus to `QuarterToneEngine`.
 *
 *   - Inbound MIDI: note-on/off messages from the DAW or standalone input
 *     are forwarded to the engine's poly synth (sample-accurate when the
 *     processBlock MIDI buffer timestamps are respected).
 *   - Outbound MIDI: game-emitted notes arrive via `queueOutgoingNote` (on
 *     the message thread) and are flushed into the processBlock MIDI buffer
 *     so they appear on the plugin's MIDI output. DAWs can route this to a
 *     second MIDI track exactly like hardware sequencer output.
 */
class MidiRouter
{
public:
    explicit MidiRouter(QuarterToneEngine& engine);

    /** Call once per processBlock — dispatches incoming MIDI + stuffs the
     *  queued outgoing notes into the same buffer. */
    void process(juce::MidiBuffer& midi, int numSamples);

    /** Thread-safe. Called from the web-bridge message thread when a game
     *  emits a note. `durationSeconds` becomes the note-off delay. */
    void queueOutgoingNote(int midiNote, float velocity, double durationSeconds);

    void setMidiOutEnabled(bool enabled) { midiOutEnabled.store(enabled); }
    bool isMidiOutEnabled() const        { return midiOutEnabled.load(); }

private:
    struct PendingNote
    {
        int   midi;
        float velocity;
        int   offDelaySamples;
    };

    QuarterToneEngine& engine;
    std::atomic<bool>  midiOutEnabled { true };

    // Bounded FIFO of notes waiting to be written to MIDI out. Access from
    // the message thread (producer) and audio thread (consumer) only.
    juce::AbstractFifo               fifo { 256 };
    std::array<PendingNote, 256>     ring {};

    // Notes that have been written as note-on and are waiting for their
    // scheduled note-off. Only touched on the audio thread.
    struct InFlightNote { int midi; int samplesUntilOff; };
    std::vector<InFlightNote>        inFlight;

    double sampleRate { 44100.0 };

    void handleIncoming(const juce::MidiMessage& m);

public:
    void setSampleRate(double sr) { sampleRate = sr; }
};

} // namespace quartertone
