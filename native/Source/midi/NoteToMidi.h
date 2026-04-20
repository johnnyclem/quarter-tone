#pragma once

#include <string>

namespace quartertone
{

/** Parse a Tone.js-style duration token ("16n", "8n", "4n", "2n", "1n",
 *  "1s", "500ms", bare number of seconds) into seconds at the given BPM.
 *  Falls back to 0.25s for tokens we don't recognise. */
double durationToSeconds(const std::string& token, float bpm);

} // namespace quartertone
