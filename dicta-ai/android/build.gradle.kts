// Build do app Android (Play Store exige AAB e targetSdk 36).
// Mantém a estrutura antiga de pastas: AndroidManifest.xml, src/, res/ e assets/ na raiz de android/.
plugins {
    id("com.android.application") version "9.5.1"
}

// A chave de envio (upload key) vem SEMPRE do ambiente — nunca de arquivo versionado.
//   DICTA_KEYSTORE=/caminho/fora/do/repo/dicta-release.keystore
//   DICTA_KS_PASS=senha
val keystorePath: String? = System.getenv("DICTA_KEYSTORE")
val keystorePass: String? = System.getenv("DICTA_KS_PASS")
val hasSigningKey = !keystorePath.isNullOrBlank() && !keystorePass.isNullOrBlank() && file(keystorePath!!).exists()

android {
    namespace = "com.dictaai.app"
    compileSdk = 36

    defaultConfig {
        // ID do app na Play Store (definido ao criar o app no Play Console; permanente).
        // O namespace do código Java continua com.dictaai.app.
        applicationId = "dictaai.app.com"
        minSdk = 24
        targetSdk = 36
        // Aumente os dois a cada versão enviada à Play Store
        versionCode = 22
        versionName = "2.1.0"
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
            create("upload") {
                storeFile = file(keystorePath!!)
                storePassword = keystorePass
                keyAlias = System.getenv("DICTA_KEY_ALIAS") ?: "dicta"
                keyPassword = keystorePass
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (hasSigningKey) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
    }
}
