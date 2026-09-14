package domorium.jetbrains

import java.io.File
import java.nio.file.Files
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class NodeRuntimeTest {
    @Test
    fun `locate returns the first name the path holds`() {
        val found = File("/somewhere/node")

        assertEquals(found, NodeRuntime.locate { name -> if (name == "node") found else null })
    }

    @Test
    fun `locate returns nothing when the path holds no node`() {
        assertNull(NodeRuntime.locate { null })
    }

    @Test
    fun `findOnPath returns the first directory holding the executable`() {
        val empty = tempDir()
        val first = tempDir()
        val second = tempDir()
        val found = first.withExecutable("node")
        second.withExecutable("node")

        assertEquals(
            found,
            NodeRuntime.findOnPath("node", listOf(empty, first, second).joinToString(File.pathSeparator)),
        )
    }

    @Test
    fun `findOnPath skips a file that cannot be executed`() {
        val dir = tempDir()
        File(dir, "node").createNewFile()

        assertNull(NodeRuntime.findOnPath("node", dir))
    }

    @Test
    fun `findOnPath skips a directory named like the executable`() {
        val dir = tempDir()
        File(dir, "node").mkdir()

        assertNull(NodeRuntime.findOnPath("node", dir))
    }

    @Test
    fun `findOnPath ignores blank entries`() {
        val dir = tempDir()
        val found = dir.withExecutable("node")

        assertEquals(
            found,
            NodeRuntime.findOnPath("node", listOf("", dir, " ").joinToString(File.pathSeparator)),
        )
    }

    @Test
    fun `findOnPath returns nothing without a path`() {
        assertNull(NodeRuntime.findOnPath("node", null))
        assertNull(NodeRuntime.findOnPath("node", ""))
    }

    private fun tempDir(): String =
        Files
            .createTempDirectory("node-runtime-")
            .toFile()
            .also { it.deleteOnExit() }
            .path

    private fun String.withExecutable(name: String): File =
        File(this, name).also {
            it.createNewFile()
            it.setExecutable(true)
            it.deleteOnExit()
        }
}
