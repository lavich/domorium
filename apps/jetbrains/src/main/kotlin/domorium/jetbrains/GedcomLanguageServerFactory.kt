package domorium.jetbrains

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.ide.BrowserUtil
import com.intellij.notification.NotificationAction
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.redhat.devtools.lsp4ij.LanguageServerFactory
import com.redhat.devtools.lsp4ij.server.CannotStartProcessException
import com.redhat.devtools.lsp4ij.server.OSProcessStreamConnectionProvider
import com.redhat.devtools.lsp4ij.server.StreamConnectionProvider
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

private const val BUNDLED_SERVER_RESOURCE = "server/stdio.cjs.js"

/**
 * The bundled Node LSP server script (built from packages/language-server by the
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
    val tempFile = Files.createTempFile("gedcom-language-server-", ".cjs.js")
    tempFile.toFile().deleteOnExit()
    resource.openStream().use { input ->
        Files.copy(input, tempFile, StandardCopyOption.REPLACE_EXISTING)
    }
    return tempFile.toAbsolutePath()
}

/**
 * Launches the GEDCOM language server (packages/language-server's stdio
 * entry point) as a `node` subprocess.
 */
class GedcomServerConnectionProvider(
    serverScript: String = extractBundledServerScript().toString(),
    private val node: File? = NodeRuntime.locate(),
    private val reportMissingRuntime: () -> Unit = {},
) : OSProcessStreamConnectionProvider() {
    init {
        val commandLine = GeneralCommandLine(node?.absolutePath ?: "node", serverScript)
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

    override fun start() {
        if (node == null) {
            reportMissingRuntime()
            throw CannotStartProcessException(MISSING_NODE_MESSAGE)
        }
        super.start()
    }

    private companion object {
        val LOG: Logger = Logger.getInstance(GedcomServerConnectionProvider::class.java)
    }
}

class GedcomLanguageServerFactory : LanguageServerFactory {
    override fun createConnectionProvider(project: Project): StreamConnectionProvider =
        GedcomServerConnectionProvider(reportMissingRuntime = { reportMissingRuntime(project) })
}

/** The log is not where a reader looks when a file has no diagnostics. #162 */
private fun reportMissingRuntime(project: Project) {
    NotificationGroupManager
        .getInstance()
        .getNotificationGroup("Domorium GEDCOM")
        .createNotification(
            "GEDCOM language server did not start",
            MISSING_NODE_MESSAGE,
            NotificationType.WARNING,
        ).addAction(
            NotificationAction.createSimple("Install Node.js") {
                BrowserUtil.browse("https://nodejs.org/")
            },
        ).notify(project)
}
