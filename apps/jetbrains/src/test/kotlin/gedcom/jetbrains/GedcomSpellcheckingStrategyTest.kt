package gedcom.jetbrains

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
    fun `GEDCOM uses plain text PSI and disables spellchecking`() {
        assertSame(PlainTextFileType.INSTANCE.language, GedcomFileType.language)
        assertTrue(isGedcomFileType(GedcomFileType))
        assertSame(SpellcheckingStrategy.EMPTY_TOKENIZER, gedcomSpellcheckingTokenizer())
    }

    @Test
    fun `strategy does not claim ordinary text files`() {
        assertFalse(isGedcomFileType(PlainTextFileType.INSTANCE))
    }

    @Test
    fun `plugin gives GEDCOM first priority in plain text spellchecking`() {
        val resource = checkNotNull(javaClass.classLoader.getResourceAsStream("META-INF/plugin.xml"))
        val document = resource.use { DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(it) }
        val fileTypeRegistration = document.getElementsByTagName("fileType").item(0)
        val registration = document.getElementsByTagName("spellchecker.support").item(0)
        val lspMapping = document.getElementsByTagName("fileNamePatternMapping").item(0)

        assertEquals("TEXT", fileTypeRegistration.attributes.getNamedItem("language").nodeValue)
        assertEquals("TEXT", registration.attributes.getNamedItem("language").nodeValue)
        assertEquals("first", registration.attributes.getNamedItem("order").nodeValue)
        assertEquals("*.ged;*.gedcom", lspMapping.attributes.getNamedItem("patterns").nodeValue)
    }
}
