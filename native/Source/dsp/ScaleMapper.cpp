#include "ScaleMapper.h"

#include <array>
#include <cassert>
#include <cmath>
#include <stdexcept>

namespace quartertone
{

namespace
{
    constexpr std::array<const char*, 12> KeyNames {
        "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
    };

    /** Interval tables — mirror SCALES in scale-mapper.ts exactly. */
    const std::vector<int>& intervalsFor(ScaleMapper::Scale s)
    {
        static const std::vector<int> Major    { 0, 2, 4, 5, 7, 9, 11 };
        static const std::vector<int> Minor    { 0, 2, 3, 5, 7, 8, 10 };
        static const std::vector<int> Penta    { 0, 2, 4, 7, 9 };
        static const std::vector<int> Blues    { 0, 3, 5, 6, 7, 10 };
        static const std::vector<int> Dorian   { 0, 2, 3, 5, 7, 9, 10 };
        static const std::vector<int> Mixo     { 0, 2, 4, 5, 7, 9, 10 };
        static const std::vector<int> Phrygian { 0, 1, 3, 5, 7, 8, 10 };

        switch (s)
        {
            case ScaleMapper::Scale::Major:    return Major;
            case ScaleMapper::Scale::Minor:    return Minor;
            case ScaleMapper::Scale::Penta:    return Penta;
            case ScaleMapper::Scale::Blues:    return Blues;
            case ScaleMapper::Scale::Dorian:   return Dorian;
            case ScaleMapper::Scale::Mixo:     return Mixo;
            case ScaleMapper::Scale::Phrygian: return Phrygian;
        }
        return Major;
    }

    int normKey(int k)
    {
        return ((k % 12) + 12) % 12;
    }

    int floorDiv(int a, int b)
    {
        int q = a / b;
        if ((a % b != 0) && ((a < 0) != (b < 0))) --q;
        return q;
    }
}

void ScaleMapper::setKey(int k) noexcept
{
    key = normKey(k);
}

std::vector<std::string> ScaleMapper::getNotes(int n) const
{
    std::vector<std::string> out;
    if (n <= 0) return out;

    const auto& intervals = intervalsFor(scale);
    out.reserve(static_cast<size_t>(intervals.size() * 3));

    for (int o = octave - 1; o <= octave + 1; ++o)
    {
        for (int i : intervals)
        {
            const int ni  = (key + i) % 12;
            const int oct = o + floorDiv(key + i, 12);
            out.push_back(std::string { KeyNames[static_cast<size_t>(ni)] } + std::to_string(oct));
        }
    }

    if (static_cast<int>(out.size()) > n)
        out.resize(static_cast<size_t>(n));
    return out;
}

std::string ScaleMapper::noteAt(int index, int poolSize) const
{
    const auto notes = getNotes(poolSize);
    if (notes.empty())
        throw std::runtime_error("Cannot resolve note from empty scale pool");
    const int idx = std::abs(index);
    return notes[static_cast<size_t>(idx) % notes.size()];
}

int ScaleMapper::noteNameToMidi(const std::string& noteName)
{
    // Parse "<letter>[#|b]<octave>" — e.g. "C4", "F#3", "Bb2".
    if (noteName.empty())
        return -1;

    size_t pos = 0;
    const char letter = noteName[pos++];
    int semitone = 0;
    switch (letter)
    {
        case 'C': semitone = 0;  break;
        case 'D': semitone = 2;  break;
        case 'E': semitone = 4;  break;
        case 'F': semitone = 5;  break;
        case 'G': semitone = 7;  break;
        case 'A': semitone = 9;  break;
        case 'B': semitone = 11; break;
        default: return -1;
    }

    if (pos < noteName.size() && noteName[pos] == '#') { ++semitone; ++pos; }
    else if (pos < noteName.size() && noteName[pos] == 'b') { --semitone; ++pos; }

    if (pos >= noteName.size()) return -1;
    int octaveNum = 0;
    try
    {
        octaveNum = std::stoi(noteName.substr(pos));
    }
    catch (const std::exception&)
    {
        return -1;
    }

    // MIDI note number: C-1 = 0, C4 = 60.
    return (octaveNum + 1) * 12 + semitone;
}

int ScaleMapper::midiAt(int index, int poolSize) const
{
    return noteNameToMidi(noteAt(index, poolSize));
}

} // namespace quartertone
