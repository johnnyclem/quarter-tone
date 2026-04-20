#pragma once

#include <functional>
#include <memory>
#include <mutex>

#include <juce_gui_extra/juce_gui_extra.h>

namespace quartertone
{

/**
 * Thin wrapper around `juce::WebBrowserComponent` that exposes a
 * bidirectional string-passing bridge matching `plugin-contract.ts` on the
 * JS side.
 *
 *   - JS → C++: page code calls `window.__QT_NATIVE__.postMessage(str)`.
 *     WebBrowserComponent delivers it through the JUCE 8 native-function
 *     interface (Resource provider / window.__QT_*); the implementation
 *     here translates that into `onMessage(str)` on the message thread.
 *   - C++ → JS: `send(json)` evaluates `window.__QT_NATIVE_RECEIVE__(json)`.
 *
 * The bridge does not parse JSON — that's `EventRouter`'s job.
 */
class WebBridge : public juce::WebBrowserComponent
{
public:
    using MessageCallback = std::function<void(const juce::String&)>;

    explicit WebBridge(MessageCallback onMessage);
    ~WebBridge() override;

    /** Navigate to the embedded cabinet. The implementation decides between
     *  file://... (dev) or juce::WebBrowserComponent::Resource callbacks
     *  (release, bundled BinaryData). */
    void loadCabinet();

    /** Push a JSON payload to the JS side via
     *  `window.__QT_NATIVE_RECEIVE__`. Safe to call from any thread — the
     *  call is marshalled onto the message thread. */
    void send(const juce::String& json);

private:
    void pageFinishedLoading(const juce::String& url) override;

    MessageCallback onMessage;
    bool pageReady { false };

    // Any sends that happen before the page's onload fire. Drained once the
    // JS side reports `{ kind: 'ready' }` (page has installed its receiver).
    std::vector<juce::String> pendingSends;
    std::mutex                pendingMutex;
};

} // namespace quartertone
