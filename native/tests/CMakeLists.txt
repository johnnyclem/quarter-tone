# Catch2 v3 fetched via CMake's FetchContent — no submodule to maintain.

include(FetchContent)
FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG        v3.5.3
)
FetchContent_MakeAvailable(Catch2)

add_executable(QuarterToneTests
    ScaleMapperTest.cpp
    PolySynthTest.cpp
    test_main.cpp
    # Re-compile the DSP sources into the test binary so the tests don't
    # depend on the plugin target's JUCE-flavoured build flags.
    ${CMAKE_CURRENT_SOURCE_DIR}/../Source/dsp/ScaleMapper.cpp
)

target_include_directories(QuarterToneTests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../Source)

target_link_libraries(QuarterToneTests PRIVATE Catch2::Catch2WithMain)

# Only the ScaleMapper test is fully self-contained; the PolySynth test
# requires JUCE headers (AudioBuffer, ADSR) and is compiled against the
# juce::juce_dsp interface target.
target_link_libraries(QuarterToneTests PRIVATE
    juce::juce_audio_basics
    juce::juce_dsp)

target_sources(QuarterToneTests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../Source/dsp/PolySynth.cpp
)

include(CTest)
include(Catch)
catch_discover_tests(QuarterToneTests)
