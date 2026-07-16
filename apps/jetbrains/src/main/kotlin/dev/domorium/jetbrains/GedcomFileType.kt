package dev.domorium.jetbrains

import com.intellij.openapi.fileTypes.LanguageFileType
import com.intellij.openapi.fileTypes.PlainTextLanguage
import com.intellij.openapi.util.IconLoader
import javax.swing.Icon

/**
 * A real IntelliJ Platform FileType (rather than only LSP4IJ's own
 * fileNamePatternMapping) so the platform's FileTypeManager considers
 * .ged and .gedcom "claimed" by an installed plugin — otherwise the IDE
 * still shows its own "no plugin handles this file" marketplace
 * suggestion even while LSP4IJ is successfully driving the language
 * server for the file. Reuses PlainTextLanguage since GEDCOM highlighting
 * comes entirely from the language server's semantic tokens, not from a
 * local lexer/grammar — there's no separate TextMate coloring to give up
 * by registering this FileType.
 */
object GedcomFileType : LanguageFileType(PlainTextLanguage.INSTANCE) {
    override fun getName(): String = "GEDCOM"

    override fun getDescription(): String = "GEDCOM genealogy data"

    override fun getDefaultExtension(): String = "ged"

    override fun getIcon(): Icon = IconLoader.getIcon("/icons/gedcomFile.svg", GedcomFileType::class.java)
}