package domorium.jetbrains

import com.intellij.openapi.actionSystem.DataContext
import com.intellij.openapi.command.CommandProcessor
import com.intellij.openapi.editor.Caret
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.actionSystem.EditorActionHandler
import com.intellij.openapi.editor.actionSystem.EditorWriteActionHandler
import com.intellij.openapi.editor.actions.EditorActionUtil
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.util.TextRange

/**
 * Deleting by word stops at each at-sign of `@I1@`, as moving by word does. A
 * selection is left to the platform, which deletes it before any word.
 */
abstract class GedcomWordDeleteHandler(
    private val original: EditorActionHandler,
    private val toWordStart: Boolean,
) : EditorWriteActionHandler.ForEachCaret() {
    override fun isEnabledForCaret(
        editor: Editor,
        caret: Caret,
        dataContext: DataContext?,
    ): Boolean = original.isEnabled(editor, caret, dataContext)

    override fun executeWriteAction(
        editor: Editor,
        caret: Caret,
        dataContext: DataContext?,
    ) {
        val range = if (caret.hasSelection() || !isGedcomEditor(editor)) null else xrefPart(editor, caret.offset)
        if (range == null) {
            original.execute(editor, caret, dataContext)
            return
        }
        // As the platform's own word deletion does, so undo groups the same.
        CommandProcessor.getInstance().setCurrentCommandGroupId(EditorActionUtil.DELETE_COMMAND_GROUP)
        CopyPasteManager.getInstance().stopKillRings()
        editor.document.deleteString(range.startOffset, range.endOffset)
    }

    private fun xrefPart(
        editor: Editor,
        offset: Int,
    ): TextRange? {
        val text = editor.document.immutableCharSequence
        return if (toWordStart) {
            xrefAt(text, offset - 1)?.let { TextRange(it.startOffset, offset) }
        } else {
            xrefAt(text, offset)?.let { TextRange(offset, it.endOffset) }
        }
    }
}

class GedcomDeleteToWordStartHandler(
    original: EditorActionHandler,
) : GedcomWordDeleteHandler(original, toWordStart = true)

class GedcomDeleteToWordStartInDifferentHumpsModeHandler(
    original: EditorActionHandler,
) : GedcomWordDeleteHandler(original, toWordStart = true)

class GedcomDeleteToWordEndHandler(
    original: EditorActionHandler,
) : GedcomWordDeleteHandler(original, toWordStart = false)

class GedcomDeleteToWordEndInDifferentHumpsModeHandler(
    original: EditorActionHandler,
) : GedcomWordDeleteHandler(original, toWordStart = false)
