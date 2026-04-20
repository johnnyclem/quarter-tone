#include "EventRouter.h"

#include "../dsp/QuarterToneEngine.h"
#include "../midi/MidiRouter.h"
#include "../midi/NoteToMidi.h"
#include "../params/Parameters.h"

namespace quartertone
{

EventRouter::EventRouter(QuarterToneEngine& e,
                         MidiRouter& m,
                         juce::AudioProcessorValueTreeState& s,
                         std::function<void(const juce::String&)> send)
    : engine(e), midi(m), apvts(s), sendToJs(std::move(send))
{
}

void EventRouter::playIndex(int index,
                            const juce::var& durationVar,
                            const juce::var& velocityVar)
{
    const auto* bpmParam = apvts.getRawParameterValue(ParamIds::bpm);
    const float bpm = bpmParam != nullptr ? bpmParam->load() : 120.0f;

    double seconds = 0.25;
    if (durationVar.isString())
        seconds = durationToSeconds(durationVar.toString().toStdString(), bpm);
    else if (durationVar.isDouble() || durationVar.isInt())
        seconds = static_cast<double>(durationVar);

    float velocity = velocityVar.isDouble() || velocityVar.isInt()
                   ? juce::jlimit(0.0f, 1.0f, static_cast<float>(velocityVar))
                   : 1.0f;

    const int midiNote = engine.midiForIndex(index);
    if (midiNote < 0 || midiNote > 127) return;

    engine.playScaleIndex(index, seconds, velocity);
    midi.queueOutgoingNote(midiNote, velocity, seconds);
}

void EventRouter::handleFromJs(const juce::String& json)
{
    juce::var parsed = juce::JSON::parse(json);
    if (! parsed.isObject()) return;

    const juce::String kind = parsed.getProperty("kind", {}).toString();

    if (kind == "note")
    {
        const int index = static_cast<int>(parsed.getProperty("index", 0));
        playIndex(index,
                  parsed.getProperty("duration", {}),
                  parsed.getProperty("velocity", {}));
    }
    else if (kind == "chord")
    {
        const auto indices = parsed.getProperty("indices", juce::var());
        if (auto* arr = indices.getArray())
        {
            for (const auto& i : *arr)
                playIndex(static_cast<int>(i),
                          parsed.getProperty("duration", {}),
                          parsed.getProperty("velocity", {}));
        }
    }
    else if (kind == "param")
    {
        const juce::String id = parsed.getProperty("id", {}).toString();
        const float value = static_cast<float>(
            static_cast<double>(parsed.getProperty("value", 0.0)));

        if (auto* p = apvts.getParameter(id))
        {
            const auto range = p->getNormalisableRange();
            p->setValueNotifyingHost(range.convertTo0to1(value));
        }
    }
    else if (kind == "ready")
    {
        sendAllParams();
    }
}

void EventRouter::sendParam(const juce::String& id)
{
    if (auto* p = apvts.getParameter(id))
    {
        const auto range = p->getNormalisableRange();
        const float value = range.convertFrom0to1(p->getValue());

        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("kind", "paramChanged");
        obj->setProperty("id", id);
        obj->setProperty("value", value);
        if (sendToJs) sendToJs(juce::JSON::toString(juce::var(obj.get()), true));
    }
}

void EventRouter::sendAllParams()
{
    static const std::array<const char*, 13> ids {
        ParamIds::key, ParamIds::scale, ParamIds::wave, ParamIds::arp,
        ParamIds::octave, ParamIds::attack, ParamIds::release,
        ParamIds::delayWet, ParamIds::reverbWet, ParamIds::volume,
        ParamIds::bpm, ParamIds::audioInSend, ParamIds::midiOutEnabled
    };
    for (const char* id : ids) sendParam(id);
}

} // namespace quartertone
