import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(keystorePropertiesFile.inputStream())
}
val releaseStoreFilePath = keystoreProperties["storeFile"] as String?
val releaseStoreFile = if (releaseStoreFilePath.isNullOrBlank()) {
    null
} else {
    rootProject.file(releaseStoreFilePath)
}
val hasReleaseKeystore = keystorePropertiesFile.exists() &&
    keystoreProperties["keyAlias"] != null &&
    keystoreProperties["keyPassword"] != null &&
    keystoreProperties["storePassword"] != null &&
    releaseStoreFile?.exists() == true

if (!hasReleaseKeystore) {
    throw GradleException("Release signing is not configured. Check android/key.properties and the release keystore file.")
}

android {
    namespace = "com.xspace360.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.xspace360.app"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["appLabel"] = "X-Space360"
        manifestPlaceholders["usesCleartextTraffic"] = "false"
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = releaseStoreFile
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }
        release {
            manifestPlaceholders["usesCleartextTraffic"] = "false"
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            manifestPlaceholders["appLabel"] = "X-Space360 Dev"
            manifestPlaceholders["usesCleartextTraffic"] = "true"
        }
        create("uat") {
            dimension = "environment"
            applicationIdSuffix = ".uat"
            versionNameSuffix = "-uat"
            manifestPlaceholders["appLabel"] = "X-Space360 UAT"
            manifestPlaceholders["usesCleartextTraffic"] = "false"
        }
        create("prod") {
            dimension = "environment"
            manifestPlaceholders["appLabel"] = "X-Space360"
            manifestPlaceholders["usesCleartextTraffic"] = "false"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
