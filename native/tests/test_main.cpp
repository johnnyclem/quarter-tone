// Catch2 v3 provides its own main via Catch2WithMain. This TU exists only
// as a single compilation point to anchor test discovery when the binary
// is built on toolchains that need a non-empty translation unit outside
// the header-only Catch2 set.
