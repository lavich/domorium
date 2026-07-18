package dev.domorium.jetbrains

import kotlin.io.path.exists
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GedcomLanguageServerFactoryTest {
    @Test
    fun `bundled server is extractable`() {
        val script = extractBundledServerScript()

        assertTrue(script.exists())
        assertTrue(script.fileName.toString().endsWith(".cjs.js"))
    }

    @Test
    fun `provider launches node with the extracted script`() {
        val script = extractBundledServerScript()
        val provider = GedcomServerConnectionProvider(script.toString())

        assertEquals("node", provider.commandLine.exePath)
        assertEquals(listOf(script.toString()), provider.commandLine.parametersList.parameters)
    }
}
