package domorium.jetbrains

import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.util.TextRange
import com.intellij.openapi.util.text.StringUtil

/** The validator lexer's xref token (packages/validator/src/parser/lexer.ts). */
private val XREF = Regex("@[A-Za-z0-9_]+@")

/** Matched left to right over the line, so `a@@b@@c` holds `@b@`. */
internal fun xrefAt(
    text: CharSequence,
    offset: Int,
): TextRange? {
    if (offset < 0 || offset >= text.length) return null
    val lineStart = StringUtil.lastIndexOf(text, '\n', 0, offset) + 1
    val lineEnd = StringUtil.indexOf(text, '\n', offset).let { if (it < 0) text.length else it }
    return XREF
        .findAll(text.subSequence(lineStart, lineEnd))
        .map { TextRange(lineStart + it.range.first, lineStart + it.range.last + 1) }
        .firstOrNull { offset in it.startOffset until it.endOffset }
}

internal fun xrefAround(
    text: CharSequence,
    offset: Int,
): TextRange? = xrefAt(text, offset)?.takeIf { it.startOffset < offset }

/** An editor made by `EditorFactory.createEditor(document, project)` has no virtual file of its own. */
internal fun isGedcomEditor(editor: Editor): Boolean =
    isGedcomFileType(FileDocumentManager.getInstance().getFile(editor.document)?.fileType)
