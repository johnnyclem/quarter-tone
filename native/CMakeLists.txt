# Quarter-Tone JUCE plugin — VST3 + AudioUnit + Standalone from one target.
#
#   cmake -B build -DCMAKE_BUILD_TYPE=Release
#   cmake --build build --config Release
#
# JUCE is expected at native/JUCE (git submodule pointing at juce-framework/JUCE,
# tag 8.x). If the checkout is missing, CMake will emit a clear error below.

cmake_minimum_required(VERSION 3.22)

project(QuarterTone
    VERSION 0.1.0
    DESCRIPTION "Quarter-Tone arcade synth — VST3 / AudioUnit / Standalone"
    LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/JUCE/CMakeLists.txt")
    message(FATAL_ERROR
        "JUCE submodule not initialised. Run:\n"
        "  git submodule update --init --recursive\n"
        "from the repository root.")
endif()

add_subdirectory(JUCE)

# ---------------------------------------------------------------------------
# Embedded web UI
# ---------------------------------------------------------------------------
# The cabinet UI is built separately (scripts/build-plugin-ui.sh) into
# native/Resources/webui/. We glob the tree at configure time and pass the
# files as JUCE binary resources so they ship inside the plugin bundle.

file(GLOB_RECURSE QT_WEBUI_FILES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/Resources/webui/*")

if(NOT QT_WEBUI_FILES)
    message(WARNING
        "native/Resources/webui/ is empty. Run scripts/build-plugin-ui.sh "
        "before building the plugin, or the embedded cabinet will be blank.")
endif()

# ---------------------------------------------------------------------------
# Plugin target
# ---------------------------------------------------------------------------

juce_add_plugin(QuarterTone
    PLUGIN_MANUFACTURER_CODE Qton
    PLUGIN_CODE             Qtco
    COMPANY_NAME            "Quarter-Tone"
    PRODUCT_NAME            "Quarter Tone"
    BUNDLE_ID               "tone.quarter.plugin"
    FORMATS                 VST3 AU Standalone
    IS_SYNTH                TRUE
    NEEDS_MIDI_INPUT        TRUE
    NEEDS_MIDI_OUTPUT       TRUE
    IS_MIDI_EFFECT          FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    VST3_CATEGORIES         Instrument Synth
    AU_MAIN_TYPE            kAudioUnitType_MusicDevice)

target_sources(QuarterTone PRIVATE
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp
    Source/dsp/QuarterToneEngine.cpp
    Source/dsp/PolySynth.cpp
    Source/dsp/FeedbackDelay.cpp
    Source/dsp/Reverb.cpp
    Source/dsp/ScaleMapper.cpp
    Source/midi/MidiRouter.cpp
    Source/midi/NoteToMidi.cpp
    Source/bridge/WebBridge.cpp
    Source/bridge/EventRouter.cpp
    Source/params/Parameters.cpp)

target_include_directories(QuarterTone PRIVATE Source)

target_compile_definitions(QuarterTone PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=1
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0)

target_link_libraries(QuarterTone PRIVATE
    juce::juce_audio_utils
    juce::juce_audio_processors
    juce::juce_dsp
    juce::juce_gui_extra)

if(QT_WEBUI_FILES)
    juce_add_binary_data(QuarterToneWebUI SOURCES ${QT_WEBUI_FILES})
    target_link_libraries(QuarterTone PRIVATE QuarterToneWebUI)
    target_compile_definitions(QuarterTone PRIVATE QT_HAS_EMBEDDED_WEBUI=1)
else()
    target_compile_definitions(QuarterTone PRIVATE QT_HAS_EMBEDDED_WEBUI=0)
endif()

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

option(QT_BUILD_TESTS "Build Quarter-Tone native tests" ON)
if(QT_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
