package gedcom.jetbrains

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.redhat.devtools.lsp4ij.LanguageServerFactory
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider
import java.nio.file.Files
import java.nio.file.StandardCopyOption

private const val BUNDLED_SERVER_RESOURCE = "server/stdio.cjs.js"

/**
 * The bundled Node LSP server script (built from packages/lsp by the
 * copyLspStdioBundle Gradle task) is packaged as a plugin resource, which
 * may live inside a jar rather than at a real filesystem path — so it's
 * extracted to a temp file (deleted on JVM exit) before being handed to
 * `node` as a command-line argument.
 */
internal fun extractBundledServerScript(): java.nio.file.Path {
    val resource =
        object {}.javaClass.classLoader.getResource(BUNDLED_SERVER_RESOURCE)
            ?: error(
                "Bundled GEDCOM language server resource ($BUNDLED_SERVER_RESOURCE) " +
                    "not found — was the copyLspStdioBundle Gradle task run?",
            )
    val tempFile = Files.createTempFile("gedcom-gedcom-lsp-", ".cjs.js")
    tempFile.toFile().deleteOnExit()
    resource.openStream().use { input ->
        Files.copy(input, tempFile, StandardCopyOption.REPLACE_EXISTING)
    }
    return tempFile.toAbsolutePath()
}

/**
 * Launches the gedcom GEDCOM language server (packages/lsp's stdio
 * entry point) as a `node` subprocess. Assumes `node` is available on the
 * user's PATH (see design doc — no auto-detection/download in v1).
 */
class GedcomServerConnectionProvider(
    serverScript: String = extractBundledServerScript().toString(),
) : OSProcessStreamConnectionProvider() {
    init {
        val commandLine = GeneralCommandLine("node", serverScript)
        setCommandLine(commandLine)
        addLogErrorHandler { message ->
            LOG.warn("GEDCOM language server stderr: $message")
        }
        addUnexpectedServerStopHandler {
            LOG.warn(
                "GEDCOM language server stopped unexpectedly " +
                    "(exitCode=${getProcessHandler()?.exitCode}, command=${commandLine.commandLineString})",
            )
        }
    }

    private companion object {
        val LOG: Logger = Logger.getInstance(GedcomServerConnectionProvider::class.java)
    }
}

class GedcomLanguageServerFactory : LanguageServerFactory {
    override fun createConnectionProvider(project: Project): StreamConnectionProvider = GedcomServerConnectionProvider()
}
