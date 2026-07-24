package dev.domorium.jetbrains

import com.intellij.openapi.fileTypes.PlainTextLanguage
import com.intellij.spellchecker.tokenizer.LanguageSpellchecking
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.redhat.devtools.lsp4ij.LanguageServersRegistry

class GedcomRuntimeIntegrationTest : BasePlatformTestCase() {
    fun testGedcomPlainTextPsiSelectsDomoriumIntegrations() {
        val psiFile = myFixture.configureByText(GedcomFileType, "0 HEAD\n1 SOUR Domorium\n0 TRLR\n")

        assertSame(GedcomFileType, psiFile.virtualFile.fileType)
        assertSame(GedcomFileType, psiFile.fileType)
        assertSame(PlainTextLanguage.INSTANCE, psiFile.language)

        val strategy =
            LanguageSpellchecking.INSTANCE
                .allForLanguage(psiFile.language)
                .first { it.isMyContext(psiFile) }
        assertTrue(strategy is GedcomSpellcheckingStrategy)
        assertSame(SpellcheckingStrategy.EMPTY_TOKENIZER, strategy.getTokenizer(psiFile))

        assertTrue(LanguageServersRegistry.getInstance().isFileSupported(psiFile))
    }
}
