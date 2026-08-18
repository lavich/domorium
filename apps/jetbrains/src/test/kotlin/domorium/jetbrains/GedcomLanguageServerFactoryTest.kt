package domorium.jetbrains

import com.redhat.devtools.lsp4ij.server.CannotStartProcessException
import java.nio.file.Files
import kotlin.io.path.exists
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class GedcomLanguageServerFactoryTest {
    @Test
    fun `bundled server is extractable`() {
        val script = extractBundledServerScript()

        assertTrue(script.exists())
        assertTrue(script.fileName.toString().endsWith(".cjs.js"))
    }

    @Test
    fun `provider launches the node it found with the extracted script`() {
        val script = extractBundledServerScript()
        val node = Files.createTempFile("node-", "").toFile()
        node.deleteOnExit()
        val provider = GedcomServerConnectionProvider(script.toString(), node)

        assertEquals(node.absolutePath, provider.commandLine.exePath)
        assertEquals(listOf(script.toString()), provider.commandLine.parametersList.parameters)
    }

    // #162: the process failed to start, a line went to the log, and the file was
    // left with no diagnostics, no completion and no colour.
    @Test
    fun `provider says so instead of launching a node that is not there`() {
        var reported = false
        val provider =
            GedcomServerConnectionProvider(
                extractBundledServerScript().toString(),
                node = null,
                reportMissingRuntime = { reported = true },
            )

        val failure = assertFailsWith<CannotStartProcessException> { provider.start() }

        assertTrue(failure.message!!.contains("Node.js"))
        assertTrue(reported)
    }
}
