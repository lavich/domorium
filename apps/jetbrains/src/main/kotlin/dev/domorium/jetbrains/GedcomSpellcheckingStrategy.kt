package dev.domorium.jetbrains

import com.intellij.psi.PsiElement
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy
import com.intellij.spellchecker.tokenizer.Tokenizer

/**
 * GEDCOM tags (TITL, OBJE, FAMC, ...) and xref pointers aren't prose, so
 * the platform's default plain-text typo inspection flags them as
 * misspellings. Suppress spellchecking entirely for .ged and .gedcom files.
 */
class GedcomSpellcheckingStrategy : SpellcheckingStrategy() {
    override fun isMyContext(element: PsiElement): Boolean = element.containingFile?.fileType == GedcomFileType

    override fun getTokenizer(element: PsiElement): Tokenizer<*> = EMPTY_TOKENIZER
}