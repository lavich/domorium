package domorium.jetbrains

import java.io.File
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
}
