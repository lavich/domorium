package domorium.jetbrains

import com.intellij.codeInsight.editorActions.ExtendWordSelectionHandlerBase
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.util.TextRange
import com.intellij.psi.PsiElement

/**
 * The platform's word selection splits `@I1@` at its at-signs. A minimal length
 * as long as the xref drops every narrower range, whichever handler offers it,
 * so double-click and Extend Selection go straight to the whole xref.
 */
class GedcomXrefSelectioner : ExtendWordSelectionHandlerBase() {
    override fun canSelect(e: PsiElement): Boolean = isGedcomFileType(e.containingFile?.fileType)

    override fun getMinimalTextRangeLength(
        element: PsiElement,
        text: CharSequence,
        cursorOffset: Int,
    ): Int = xrefAt(text, cursorOffset)?.length ?: 0

    override fun select(
        e: PsiElement,
        editorText: CharSequence,
        cursorOffset: Int,
        editor: Editor,
    ): List<TextRange> = listOfNotNull(xrefAt(editorText, cursorOffset))
}
