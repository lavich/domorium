import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.jetbrains.kotlin.jvm") version "2.0.20"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "dev.domorium"
version = "0.1.0"

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
    }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion {
            sinceBuild = "242"
        }
    }
    publishing {
        token.set(providers.environmentVariable("PUBLISH_TOKEN"))
    }
}

// The LSP server itself lives in packages/lsp (this monorepo's npm
// workspace) — build its standalone Node bundle and copy it into this
// plugin's resources so GedcomServerConnectionProvider can launch it
// without requiring consumers to check out/npm-install the whole repo.
val lspPackageDir = layout.projectDirectory.dir("../../packages/lsp")
val validatorPackageDir = layout.projectDirectory.dir("../../packages/validator")

val buildLspStdioBundle = tasks.register<Exec>("buildLspStdioBundle") {
    workingDir = lspPackageDir.asFile
    commandLine("npm", "run", "build:stdio")
    inputs.dir(lspPackageDir.dir("src"))
    inputs.dir(validatorPackageDir.dir("src"))
    outputs.file(lspPackageDir.file("dist-stdio/stdio.cjs.js"))
}

val generatedResourcesDir = layout.buildDirectory.dir("generated/lsp-server")

val copyLspStdioBundle = tasks.register<Copy>("copyLspStdioBundle") {
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

tasks.withType<KotlinCompile> {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

tasks.named<JavaCompile>("compileJava") {
    sourceCompatibility = "17"
    targetCompatibility = "17"
}
