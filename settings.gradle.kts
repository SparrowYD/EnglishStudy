pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ShadowDict"

// :core is pure Kotlin/JVM (scoring engine + subtitle parser) and can be
// built & tested without the Android SDK. :app requires the Android SDK, so
// it is only included when an SDK location is available. This lets the core
// logic be unit-tested in headless/CI environments that lack the SDK.
include(":core")

val androidSdkAvailable: Boolean =
    System.getenv("ANDROID_HOME") != null ||
        System.getenv("ANDROID_SDK_ROOT") != null ||
        file("local.properties").let { it.exists() && it.readText().contains("sdk.dir") }

if (androidSdkAvailable) {
    include(":app")
} else {
    logger.lifecycle("[ShadowDict] Android SDK not found — configuring :core only. Set ANDROID_HOME or local.properties to build :app.")
}
