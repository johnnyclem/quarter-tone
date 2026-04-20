#include "WebBridge.h"

namespace quartertone
{

namespace
{
    /**
     * JUCE 8 exposes bidirectional JS↔C++ plumbing via
     * `juce::WebBrowserComponent::Options::withNativeIntegrationEnabled`. The
     * JS side receives a `window.juce` object and can call
     * `juce.emitEvent(name, payload)`; the C++ side registers handlers via
     * `addEventListener`. We translate both directions into the single
     * `postMessage` string channel declared in `plugin-contract.ts`.
     */
    juce::WebBrowserComponent::Options buildOptions()
    {
        juce::WebBrowserComponent::Options opts;
        opts = opts.withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                   .withWinWebView2Options({})
                   .withNativeIntegrationEnabled();
        return opts;
    }
}

WebBridge::WebBridge(MessageCallback cb)
    : juce::WebBrowserComponent(buildOptions())
    , onMessage(std::move(cb))
{
    addEventListener("qt-js-to-native",
        [this] (const juce::var& payload)
        {
            if (onMessage)
                onMessage(payload.toString());
        });
}

WebBridge::~WebBridge() = default;

void WebBridge::loadCabinet()
{
    // When the cabinet is embedded as JUCE BinaryData the plugin installs a
    // Resource provider (registered in PluginEditor) and we navigate to the
    // virtual origin; otherwise fall back to about:blank so the app is at
    // least inert.
   #if QT_HAS_EMBEDDED_WEBUI
    goToURL("https://quarter-tone.local/index.html");
   #else
    goToURL("about:blank");
   #endif
}

void WebBridge::pageFinishedLoading(const juce::String& /*url*/)
{
    pageReady = true;

    // Install the JS-side receiver shim and bridge-facing globals so the
    // app can detect it's in the plugin host and wire up PluginHost.ts.
    evaluateJavascript(R"(
        (function () {
            window.__QT_NATIVE__ = {
                postMessage: function (msg) {
                    if (window.juce && window.juce.emitEvent) {
                        window.juce.emitEvent('qt-js-to-native', msg);
                    }
                }
            };
            window.__QT_NATIVE_RECEIVE__ = window.__QT_NATIVE_RECEIVE__ || function () {};
        })();
    )", nullptr);

    std::vector<juce::String> drained;
    {
        std::lock_guard<std::mutex> lock(pendingMutex);
        drained = std::move(pendingSends);
        pendingSends.clear();
    }
    for (const auto& payload : drained) send(payload);
}

void WebBridge::send(const juce::String& json)
{
    juce::WeakReference<WebBridge> weak { this };
    auto deliver = [weak, json] ()
    {
        if (auto* self = weak.get())
        {
            if (! self->pageReady)
            {
                std::lock_guard<std::mutex> lock(self->pendingMutex);
                self->pendingSends.push_back(json);
                return;
            }

            const juce::String escaped = json.replace("\\", "\\\\").replace("\"", "\\\"");
            self->evaluateJavascript(
                "if (window.__QT_NATIVE_RECEIVE__) window.__QT_NATIVE_RECEIVE__(\""
                + escaped + "\");",
                nullptr);
        }
    };

    if (juce::MessageManager::getInstance()->isThisTheMessageThread())
        deliver();
    else
        juce::MessageManager::callAsync(std::move(deliver));
}

} // namespace quartertone
