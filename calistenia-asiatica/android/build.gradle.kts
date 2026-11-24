// App Android: casca WebView que carrega o app web de assets/www.
plugins {
    id("com.android.application") version "9.5.1"
}

// Chave de assinatura vem SEMPRE do ambiente — nunca de arquivo versionado (repositório público).
//   CALIS_KEYSTORE=/caminho/fora/do/repo/calistenia.keystore
//   CALIS_KS_PASS=senha
val keystorePath: String? = System.getenv("CALIS_KEYSTORE")
val keystorePass: String? = System.getenv("CALIS_KS_PASS")
val hasSigningKey = !keystorePath.isNullOrBlank() && !keystorePass.isNullOrBlank() && file(keystorePath!!).exists()

android {
    namespace = "com.calisteniaasiatica.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.calisteniaasiatica.app"
        minSdk = 24
        targetSdk = 36
        // Aumente os dois a cada nova versão
        versionCode = 1
        versionName = "1.0.0"
    }

    sourceSets {
        getByName("main") {
            manifest.srcFile("AndroidManifest.xml")
            java.setSrcDirs(listOf("src"))
            res.setSrcDirs(listOf("res"))
            assets.setSrcDirs(listOf("assets"))
        }
    }

    signingConfigs {
        if (hasSigningKey) {
            create("release") {
                storeFile = file(keystorePath!!)
                storePassword = keystorePass
                keyAlias = System.getenv("CALIS_KEY_ALIAS") ?: "calistenia"
                keyPassword = keystorePass
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (hasSigningKey) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
