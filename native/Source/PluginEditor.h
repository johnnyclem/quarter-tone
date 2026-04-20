#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

#include "PluginProcessor.h"
#include "bridge/WebBridge.h"

namespace quartertone
{

/**
 * Host the React cabinet inside a WebBrowserComponent and glue its bridge
 * messages to the processor's EventRouter.
 *
 * Plain JUCE buttons are deliberately absent: the entire UI lives in the
 * web view (reusing `packages/app`), which gives us the arcade look, all
 * 12 games, and the synth drawer for free.
 */
class QuarterToneEditor : public juce::AudioProcessorEditor
{
public:
    explicit QuarterToneEditor(QuarterToneProcessor& owner);
    ~QuarterToneEditor() override;

    void resized() override;

private:
    QuarterToneProcessor& processor;
    std::unique_ptr<WebBridge> bridge;
};

} // namespace quartertone
