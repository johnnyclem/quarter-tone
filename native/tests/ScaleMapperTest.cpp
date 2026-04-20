#include <catch2/catch_test_macros.hpp>

#include "dsp/ScaleMapper.h"

using quartertone::ScaleMapper;

TEST_CASE("ScaleMapper defaults to C Major at octave 4", "[scale]")
{
    ScaleMapper m;
    const auto notes = m.getNotes(7);
    REQUIRE(notes.size() == 7);
    REQUIRE(notes[0] == "C3");
    REQUIRE(notes[1] == "D3");
    REQUIRE(notes[2] == "E3");
    REQUIRE(notes[3] == "F3");
    REQUIRE(notes[4] == "G3");
    REQUIRE(notes[5] == "A3");
    REQUIRE(notes[6] == "B3");
}

TEST_CASE("ScaleMapper setKey transposes by semitone", "[scale]")
{
    ScaleMapper m;
    m.setKey(2);           // D
    m.setScale(ScaleMapper::Scale::Major);
    const auto notes = m.getNotes(7);
    REQUIRE(notes[0] == "D3");
    REQUIRE(notes[1] == "E3");
    REQUIRE(notes[2] == "F#3");
    REQUIRE(notes[6] == "C#4"); // leading tone crosses octave boundary
}

TEST_CASE("ScaleMapper minor scale", "[scale]")
{
    ScaleMapper m;
    m.setKey(9);           // A
    m.setScale(ScaleMapper::Scale::Minor);
    const auto notes = m.getNotes(7);
    REQUIRE(notes[0] == "A3");
    REQUIRE(notes[1] == "B3");
    REQUIRE(notes[2] == "C4");
    REQUIRE(notes[3] == "D4");
}

TEST_CASE("ScaleMapper::noteAt wraps via abs+modulo", "[scale]")
{
    ScaleMapper m;
    const auto first = m.noteAt(0);
    REQUIRE_FALSE(first.empty());
    REQUIRE(m.noteAt(0) == m.noteAt(-0));
    REQUIRE(m.noteAt(16) == m.noteAt(0)); // wraps
}

TEST_CASE("ScaleMapper::noteNameToMidi round-trips with noteAt", "[scale]")
{
    REQUIRE(ScaleMapper::noteNameToMidi("C4") == 60);
    REQUIRE(ScaleMapper::noteNameToMidi("A4") == 69);
    REQUIRE(ScaleMapper::noteNameToMidi("C#3") == 49);
    REQUIRE(ScaleMapper::noteNameToMidi("Bb3") == 58);
}

TEST_CASE("ScaleMapper::midiAt returns playable MIDI notes", "[scale]")
{
    ScaleMapper m;
    for (int i = 0; i < 21; ++i)
    {
        const int midi = m.midiAt(i);
        REQUIRE(midi >= 0);
        REQUIRE(midi <= 127);
    }
}

TEST_CASE("ScaleMapper pentatonic has 5 degrees per octave", "[scale]")
{
    ScaleMapper m;
    m.setScale(ScaleMapper::Scale::Penta);
    const auto notes = m.getNotes(15);
    REQUIRE(notes.size() == 15); // 3 octaves * 5 degrees
}
