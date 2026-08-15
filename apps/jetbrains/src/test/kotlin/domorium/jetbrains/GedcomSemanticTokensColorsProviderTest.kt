package domorium.jetbrains

import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import javax.xml.parsers.DocumentBuilderFactory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertSame

class GedcomSemanticTokensColorsProviderTest {
    @Test
    fun `a reference to a record is painted as a field`() {
        assertSame(
            DefaultLanguageHighlighterColors.INSTANCE_FIELD,
            pointerAttributesKey(POINTER_TOKEN_TYPE, emptyList()),
        )
    }

    // LSP4IJ has a declaration key for a class, a function, a method and a
    // namespace, and none for a variable, so without this the declaration of a
    // record looked exactly like a reference to it.
    @Test
    fun `the record a pointer declares is painted apart from a use of it`() {
        assertSame(
            DefaultLanguageHighlighterColors.FUNCTION_DECLARATION,
            pointerAttributesKey(POINTER_TOKEN_TYPE, listOf(DECLARATION_MODIFIER)),
        )
    }

    @Test
    fun `a level, a tag and a payload are left to LSP4IJ`() {
        assertNull(pointerAttributesKey("comment", emptyList()))
        assertNull(pointerAttributesKey("keyword", emptyList()))
        assertNull(pointerAttributesKey("string", listOf(DECLARATION_MODIFIER)))
    }

    @Test
    fun `the provider is registered for the server that sends the tokens`() {
        val resource = checkNotNull(javaClass.classLoader.getResourceAsStream("META-INF/plugin.xml"))
        val document = resource.use { DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(it) }
        val server = document.getElementsByTagName("server").item(0)
        val provider = document.getElementsByTagName("semanticTokensColorsProvider").item(0)

        assertEquals(
            server.attributes.getNamedItem("id").nodeValue,
            provider.attributes.getNamedItem("serverId").nodeValue,
        )
        assertEquals(
            "domorium.jetbrains.GedcomSemanticTokensColorsProvider",
            provider.attributes.getNamedItem("class").nodeValue,
        )
    }
}
