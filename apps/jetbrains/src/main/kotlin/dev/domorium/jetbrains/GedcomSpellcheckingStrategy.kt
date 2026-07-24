package dev.domorium.jetbrains

import com.intellij.openapi.fileTypes.FileType
import com.intellij.psi.PsiElement
import com.intellij.spellchecker.tokenizer.SpellcheckingStrategy
import com.intellij.spellchecker.tokenizer.Tokenizer

/**
 * GEDCOM tags (TITL, OBJE, FAMC, ...) and xref pointers aren't prose, so
 * the platform's default plain-text typo inspection flags them as
 * misspellings. Suppress spellchecking entirely for .ged and .gedcom files.
 */
class GedcomSpellcheckingStrategy : SpellcheckingStrategy() {
    override fun isMyContext(element: PsiElement): Boolean = isGedcomFileType(element.containingFile?.virtualFile?.fileType)

    override fun getTokenizer(element: PsiElement): Tokenizer<*> = gedcomSpellcheckingTokenizer()
}

internal fun isGedcomFileType(fileType: FileType?): Boolean = fileType == GedcomFileType

internal fun gedcomSpellcheckingTokenizer(): Tokenizer<*> = SpellcheckingStrategy.EMPTY_TOKENIZER
