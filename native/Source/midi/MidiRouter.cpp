#include "MidiRouter.h"

#include "../dsp/QuarterToneEngine.h"

namespace quartertone
{

MidiRouter::MidiRouter(QuarterToneEngine& e) : engine(e)
{
    inFlight.reserve(64);
}

void MidiRouter::handleIncoming(const juce::MidiMessage& m)
{
    if (m.isNoteOn())
        engine.playMidi(m.getNoteNumber(),
                        static_cast<float>(m.getVelocity()) / 127.0f);
    else if (m.isNoteOff())
        engine.stopMidi(m.getNoteNumber());
    else if (m.isAllNotesOff() || m.isAllSoundOff())
        engine.releaseAll();
}

void MidiRouter::queueOutgoingNote(int midiNote, float velocity, double durationSeconds)
{
    if (midiNote < 0 || midiNote > 127) return;

    const int offDelay = juce::jmax(1, static_cast<int>(durationSeconds * sampleRate));

    const auto scope = fifo.write(1);
    if (scope.blockSize1 > 0)
        ring[static_cast<size_t>(scope.startIndex1)] = { midiNote, velocity, offDelay };
    else if (scope.blockSize2 > 0)
        ring[static_cast<size_t>(scope.startIndex2)] = { midiNote, velocity, offDelay };
}

void MidiRouter::process(juce::MidiBuffer& midi, int numSamples)
{
    // 1) Drain incoming MIDI into the engine.
    for (const auto meta : midi)
        handleIncoming(meta.getMessage());

    // 2) Pull any queued outgoing notes, fire note-on now, schedule note-off.
    const bool midiOut = midiOutEnabled.load(std::memory_order_relaxed);
    const auto scope = fifo.read(fifo.getNumReady());
    auto emit = [&] (int idx)
    {
        const auto& n = ring[static_cast<size_t>(idx)];
        // Always feed the internal engine.
        engine.playMidi(n.midi, n.velocity);

        if (midiOut)
        {
            midi.addEvent(juce::MidiMessage::noteOn(1, n.midi,
                static_cast<juce::uint8>(juce::jlimit(1, 127,
                    static_cast<int>(n.velocity * 127.0f)))), 0);
        }
        inFlight.push_back({ n.midi, n.offDelaySamples });
    };

    for (int i = 0; i < scope.blockSize1; ++i) emit(scope.startIndex1 + i);
    for (int i = 0; i < scope.blockSize2; ++i) emit(scope.startIndex2 + i);

    // 3) Age in-flight notes; emit note-off when their timer elapses.
    for (auto it = inFlight.begin(); it != inFlight.end(); )
    {
        it->samplesUntilOff -= numSamples;
        if (it->samplesUntilOff <= 0)
        {
            engine.stopMidi(it->midi);
            if (midiOut)
                midi.addEvent(juce::MidiMessage::noteOff(1, it->midi), numSamples - 1);
            it = inFlight.erase(it);
        }
        else
        {
            ++it;
        }
    }
}

} // namespace quartertone
