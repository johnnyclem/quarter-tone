#include "NoteToMidi.h"

#include <cstdlib>

namespace quartertone
{

double durationToSeconds(const std::string& token, float bpm)
{
    if (token.empty() || bpm <= 0.0f) return 0.25;

    // "Nn" where N is a subdivision (1/N of a whole note).
    if (token.back() == 'n')
    {
        const std::string num = token.substr(0, token.size() - 1);
        const int subdiv = std::atoi(num.c_str());
        if (subdiv <= 0) return 0.25;
        const double whole = (60.0 / bpm) * 4.0;
        return whole / static_cast<double>(subdiv);
    }

    // "Nms" milliseconds.
    if (token.size() >= 2 && token[token.size() - 1] == 's'
        && token[token.size() - 2] == 'm')
    {
        return std::atof(token.substr(0, token.size() - 2).c_str()) / 1000.0;
    }

    // "Ns" seconds.
    if (token.back() == 's')
        return std::atof(token.substr(0, token.size() - 1).c_str());

    // Bare number — treat as seconds.
    const double v = std::atof(token.c_str());
    return v > 0.0 ? v : 0.25;
}

} // namespace quartertone
