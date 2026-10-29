package domorium.jetbrains

import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.editor.Caret
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.ScrollType
import com.intellij.openapi.editor.actionSystem.EditorActionHandler

/**
 * The platform stops a word move at each at-sign of `@I1@`, by character, with
 * no hook for a file type on the TEXT language. Wrapping the action's handler
 * keeps its caret stops everywhere but inside an xref.
 */
abstract class GedcomWordMoveHandler(
    private val original: EditorActionHandler,
    private val forward: Boolean,
    private val withSelection: Boolean,
) : EditorActionHandler.ForEachCaret() {
    override fun isEnabledForCaret(
        editor: Editor,
        caret: Caret,
        dataContext: DataContext?,
    ): Boolean = original.isEnabled(editor, caret, dataContext)

    override fun doExecute(
        editor: Editor,
        caret: Caret,
        dataContext: DataContext?,
    ) {
        if (!isGedcomEditor(editor)) {
            original.execute(editor, caret, dataContext)
            return
        }
        val text = editor.document.immutableCharSequence
        val xref =
            xrefAround(text, caret.offset) ?: run {
                original.execute(editor, caret, dataContext)
                xrefAround(text, caret.offset)
            } ?: return
        moveTo(editor, caret, if (forward) xref.endOffset else xref.startOffset)
    }

    private fun moveTo(
        editor: Editor,
        caret: Caret,
        offset: Int,
    ) {
        val anchor = caret.leadSelectionOffset
        caret.moveToOffset(offset)
        if (withSelection && anchor != offset) {
            caret.setSelection(minOf(anchor, offset), maxOf(anchor, offset))
        } else {
            caret.removeSelection()
        }
        if (caret == editor.caretModel.primaryCaret) {
            editor.scrollingModel.scrollToCaret(ScrollType.RELATIVE)
        }
    }
}

class GedcomNextWordHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = true, withSelection = false)

class GedcomNextWordWithSelectionHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = true, withSelection = true)

class GedcomNextWordInDifferentHumpsModeHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = true, withSelection = false)

class GedcomNextWordInDifferentHumpsModeWithSelectionHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = true, withSelection = true)

class GedcomPreviousWordHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = false, withSelection = false)

class GedcomPreviousWordWithSelectionHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = false, withSelection = true)

class GedcomPreviousWordInDifferentHumpsModeHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = false, withSelection = false)

class GedcomPreviousWordInDifferentHumpsModeWithSelectionHandler(
    original: EditorActionHandler,
) : GedcomWordMoveHandler(original, forward = false, withSelection = true)
