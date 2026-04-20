#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

#include "dsp/QuarterToneEngine.h"
#include "midi/MidiRouter.h"
#include "params/Parameters.h"

namespace quartertone
{

class EventRouter; // fwd

/**
 * Host-facing AudioProcessor. Owns the audio engine + MIDI router + the
 * parameter tree; the editor (and its embedded web UI) talk to the engine
 * exclusively through this processor.
 */
class QuarterToneProcessor : public juce::AudioProcessor,
                             private juce::AudioProcessorValueTreeState::Listener
{
public:
    QuarterToneProcessor();
    ~QuarterToneProcessor() override;

    // ---- AudioProcessor --------------------------------------------------
    const juce::String getName() const override { return "Quarter Tone"; }

    void prepareToPlay(double sampleRate, int blockSize) override;
    void releaseResources() override;
    bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    bool acceptsMidi()  const override { return true;  }
    bool producesMidi() const override { return true;  }
    bool isMidiEffect() const override { return false; }

    double getTailLengthSeconds() const override { return 3.0; }

    int getNumPrograms() override    { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& dest) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    // ---- Quarter-Tone internals (exposed for the Editor) -----------------
    QuarterToneEngine&                  getEngine()       { return engine; }
    MidiRouter&                         getMidiRouter()   { return midi;   }
    juce::AudioProcessorValueTreeState& getApvts()        { return apvts;  }
    EventRouter*                        getEventRouter()  { return eventRouter.get(); }
    void setEventRouter(std::unique_ptr<EventRouter> r);

private:
    void parameterChanged(const juce::String& paramId, float newValue) override;
    void applyAllParams();

    QuarterToneEngine                  engine;
    MidiRouter                         midi { engine };
    juce::AudioProcessorValueTreeState apvts;
    std::unique_ptr<EventRouter>       eventRouter;

    static juce::AudioProcessor::BusesProperties makeBuses();
};

} // namespace quartertone
