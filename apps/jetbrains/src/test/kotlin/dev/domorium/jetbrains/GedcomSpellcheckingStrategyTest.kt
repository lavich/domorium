package dev.domorium.jetbrains

import com.intellij.openapi.fileTypes.PlainTextFileType
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy
import javax.xml.parsers.DocumentBuilderFactory
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertSame
import kotlin.test.assertTrue

class GedcomSpellcheckingStrategyTest {
    @Test
    fun `GEDCOM uses its own language and disables spellchecking`() {
        assertSame(GedcomLanguage, GedcomFileType.language)
        assertTrue(isGedcomFileType(GedcomFileType))
        assertSame(SpellcheckingStrategy.EMPTY_TOKENIZER, gedcomSpellcheckingTokenizer())
    }

    @Test
    fun `strategy does not claim ordinary text files`() {
        assertFalse(isGedcomFileType(PlainTextFileType.INSTANCE))
    }

    @Test
    fun `plugin registers spellchecking for the dedicated GEDCOM language`() {
        val resource = checkNotNull(javaClass.classLoader.getResourceAsStream("META-INF/plugin.xml"))
        val document = resource.use { DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(it) }
        val fileTypeRegistration = document.getElementsByTagName("fileType").item(0)
        val registration = document.getElementsByTagName("spellchecker.support").item(0)

        assertEquals("GEDCOM", fileTypeRegistration.attributes.getNamedItem("language").nodeValue)
        assertEquals("GEDCOM", registration.attributes.getNamedItem("language").nodeValue)
    }
}
