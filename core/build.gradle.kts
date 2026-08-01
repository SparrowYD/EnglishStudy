// :core — pure Kotlin/JVM module.
//
// Holds the two pieces of logic that must be provably correct and that carry no
// Android dependency: the dictation scoring engine (spec §6) and the subtitle
// parser (spec §10), plus chunk splitting (spec §4). Because it is plain
// Kotlin/JVM it can be unit-tested without the Android SDK.
plugins {
    alias(libs.plugins.kotlin.jvm)
}

dependencies {
    testImplementation(libs.junit)
}

tasks.withType<Test> {
    useJUnit()
    testLogging {
        events("passed", "skipped", "failed")
    }
}
