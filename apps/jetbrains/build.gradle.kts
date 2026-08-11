import org.jetbrains.intellij.platform.gradle.TestFrameworkType
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.jetbrains.kotlin.jvm") version "2.4.10"
    id("org.jetbrains.intellij.platform") version "2.18.1"
    id("com.diffplug.spotless") version "8.9.0"
}

group = "domorium"
version = "1.5.1"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // Generic IntelliJ Platform target (IDEA Community as the reference
        // SDK for compilation) rather than a specific product — plugin.xml
        // only depends on com.intellij.modules.platform, so this installs
        // in any JetBrains IDE that shares the platform (WebStorm, PyCharm,
        // etc.), not just IDEA.
        create("IC", "2024.2")
        plugin("com.redhat.devtools.lsp4ij", "0.20.1")
        testFramework(TestFrameworkType.Platform)
    }
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testRuntimeOnly("org.junit.vintage:junit-vintage-engine:6.1.3")
}

spotless {
    kotlin {
        target("src/**/*.kt")
        ktlint()
    }
    kotlinGradle {
        target("*.gradle.kts")
        ktlint()
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "242"
        }
    }
    pluginVerification {
        ides {
            // Naming a build newer than this answers with is silently ignored:
            // no error, no download, no verification.
            recommended()
        }
    }
    publishing {
        token.set(providers.environmentVariable("PUBLISH_TOKEN"))
    }
}

// The LSP server itself lives in packages/language-server (this monorepo's npm
// workspace) — build its standalone Node bundle and copy it into this
// plugin's resources so GedcomServerConnectionProvider can launch it
// without requiring consumers to check out/npm-install the whole repo.
val lspPackageDir = layout.projectDirectory.dir("../../packages/language-server")
val validatorPackageDir = layout.projectDirectory.dir("../../packages/validator")
val languageServicePackageDir =
    layout.projectDirectory.dir("../../packages/language-service")

val buildLspStdioBundle =
    tasks.register<Exec>("buildLspStdioBundle") {
        workingDir = lspPackageDir.asFile
        commandLine("npm", "run", "build:stdio")
        // Everything the bundle contains. Leaving language-service out meant a
        // change confined to it was reported up to date and the plugin kept
        // running the previous build.
        inputs.dir(lspPackageDir.dir("src"))
        inputs.dir(validatorPackageDir.dir("src"))
        inputs.dir(languageServicePackageDir.dir("src"))
        outputs.file(lspPackageDir.file("dist-stdio/stdio.cjs.js"))
    }

val generatedResourcesDir = layout.buildDirectory.dir("generated/lsp-server")

val copyLspStdioBundle =
    tasks.register<Copy>("copyLspStdioBundle") {
        dependsOn(buildLspStdioBundle)
        from(lspPackageDir.file("dist-stdio/stdio.cjs.js"))
        // Lands on the classpath as "server/stdio.cjs.js", matching the
        // resource path GedcomServerConnectionProvider looks up at runtime.
        into(generatedResourcesDir.map { it.dir("server") })
    }

sourceSets {
    main {
        resources.srcDir(generatedResourcesDir)
    }
}

tasks.named("processResources") {
    dependsOn(copyLspStdioBundle)
}

tasks.test {
    dependsOn(copyLspStdioBundle)
    useJUnitPlatform()
}

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

tasks.withType<JavaCompile> {
    sourceCompatibility = "17"
    targetCompatibility = "17"
}
