#include <catch2/catch_test_macros.hpp>

#include <juce_audio_basics/juce_audio_basics.h>

#include "dsp/PolySynth.h"

using quartertone::PolySynth;

TEST_CASE("PolySynth renders audio after noteOn", "[synth]")
{
    PolySynth s;
    s.prepare(44100.0, 512, 2);
    s.setWave(PolySynth::Wave::Sine);
    s.setAttack(0.001f);
    s.setRelease(0.05f);
    s.noteOn(69, 1.0f);

    juce::AudioBuffer<float> buf (2, 512);
    buf.clear();
    s.renderNextBlock(buf, 0, 512);

    // Some non-zero energy should be present after the attack.
    float peak = 0.0f;
    for (int ch = 0; ch < 2; ++ch)
        peak = std::max(peak, buf.getMagnitude(ch, 0, 512));
    REQUIRE(peak > 0.0f);
}

TEST_CASE("PolySynth noteOff eventually deactivates the voice", "[synth]")
{
    PolySynth s;
    s.prepare(44100.0, 512, 1);
    s.setAttack(0.001f);
    s.setRelease(0.001f);
    s.noteOn(60, 1.0f);

    juce::AudioBuffer<float> buf (1, 512);
    buf.clear();
    s.renderNextBlock(buf, 0, 512);
    s.noteOff(60);

    // Render enough samples for the quick release to finish.
    for (int i = 0; i < 10; ++i)
    {
        buf.clear();
        s.renderNextBlock(buf, 0, 512);
    }

    const float tail = buf.getMagnitude(0, 0, 512);
    REQUIRE(tail < 0.001f);
}
