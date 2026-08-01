// Top-level build file.
//
// Plugins are declared per-module (see :core and :app build files) rather than
// aliased here with `apply false`. That keeps the Android Gradle Plugin (hosted
// only on Google's Maven repo) out of the root classpath so that the pure
// Kotlin/JVM :core module can be built and unit-tested in environments that
// cannot reach Google Maven or lack the Android SDK.
