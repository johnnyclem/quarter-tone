#include "PluginEditor.h"

#include "bridge/EventRouter.h"

#if QT_HAS_EMBEDDED_WEBUI
    #include "BinaryData.h"
#endif

namespace quartertone
{

QuarterToneEditor::QuarterToneEditor(QuarterToneProcessor& owner)
    : juce::AudioProcessorEditor(owner)
    , processor(owner)
{
    setSize(1024, 720);
    setResizable(true, true);
    setResizeLimits(640, 480, 2560, 1440);

    bridge = std::make_unique<WebBridge>(
        [this] (const juce::String& payload)
        {
            if (auto* er = processor.getEventRouter())
                er->handleFromJs(payload);
        });

    auto routed = std::make_unique<EventRouter>(
        processor.getEngine(),
        processor.getMidiRouter(),
        processor.getApvts(),
        [this] (const juce::String& json) { if (bridge) bridge->send(json); });
    processor.setEventRouter(std::move(routed));

    addAndMakeVisible(*bridge);
    bridge->loadCabinet();
}

QuarterToneEditor::~QuarterToneEditor()
{
    processor.setEventRouter(nullptr);
}

void QuarterToneEditor::resized()
{
    if (bridge != nullptr)
        bridge->setBounds(getLocalBounds());
}

} // namespace quartertone
