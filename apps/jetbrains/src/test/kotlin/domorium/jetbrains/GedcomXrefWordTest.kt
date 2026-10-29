package domorium.jetbrains

import com.intellij.openapi.actionSystem.IdeActions
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.psi.PsiDocumentManager
import com.intellij.testFramework.EditorTestUtil
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.redhat.devtools.lsp4ij.LanguageServiceAccessor

class GedcomXrefWordTest : BasePlatformTestCase() {
    private var fileCount = 0

    fun testDoubleClickTakesAPointerWholeFromEveryCharacter() {
        for (marked in listOf(
            "1 HUSB <caret>@I1@",
            "1 HUSB @<caret>I1@",
            "1 HUSB @I<caret>1@",
            "1 HUSB @I1<caret>@",
            "1 HUSB @I1@<caret>",
        )) {
            assertEquals(marked, "1 HUSB <selection>@I1@</selection>", run("ged", marked, ::doubleClick))
            assertEquals(marked, "1 HUSB <selection>@I1@</selection>", run("ged", marked, SELECT_WORD))
        }
    }

    fun testDoubleClickTakesARecordXrefWhole() {
        assertEquals("0 <selection>@F12@</selection> FAM", run("ged", "0 @F<caret>12@ FAM", ::doubleClick))
    }

    fun testDoubleClickTakesAVoidPointerWhole() {
        assertEquals("1 FAMC <selection>@VOID@</selection>", run("ged", "1 FAMC @VO<caret>ID@", ::doubleClick))
    }

    fun testExtendSelectionFromInsideAnXrefTakesItWhole() {
        assertEquals(
            "1 HUSB <selection>@I1@</selection>",
            run("ged", "1 HUSB @<selection>I<caret></selection>1@", SELECT_WORD),
        )
    }

    fun testShrinkSelectionFromAnXrefStopsAtNothingInsideIt() {
        val shrunk =
            run("ged", "1 HUSB @I<caret>1@") { editor ->
                EditorTestUtil.executeAction(editor, IdeActions.ACTION_EDITOR_SELECT_WORD_AT_CARET)
                EditorTestUtil.executeAction(editor, IdeActions.ACTION_EDITOR_UNSELECT_WORD_AT_CARET)
            }
        assertFalse(shrunk, shrunk.contains("<selection>"))
    }

    fun testExtendSelectionTakesTheXrefOfEachCaret() {
        assertEquals(
            "1 HUSB <selection>@I1@</selection>\n1 FAMS <selection>@F1@</selection>",
            run("ged", "1 HUSB @I<caret>1@\n1 FAMS @F<caret>1@", SELECT_WORD),
        )
    }

    fun testEscapedAtSignsLeaveTheXrefTheyHold() {
        assertEquals("1 NOTE a@<selection>@b@</selection>@c", run("ged", "1 NOTE a@@<caret>b@@c", ::doubleClick))
        assertEquals("1 NOTE @<selection>@I1@</selection>@", run("ged", "1 NOTE @@<caret>I1@@", ::doubleClick))
    }

    fun testACaretBeforePunctuationIsNotOnTheXref() {
        val line = "1 NOTE (@I1@)"
        assertNull(xrefAt(line, line.indexOf(')')))
        assertEquals(
            run("txt", "1 NOTE (@I1@<caret>)", ::doubleClick),
            run("ged", "1 NOTE (@I1@<caret>)", ::doubleClick),
        )
    }

    fun testACalendarEscapeSelectsAsThePlatformSelectsIt() {
        assertEquals(
            "2 DATE @#<selection>DJULIAN</selection>@ 1 JAN 1700",
            run("ged", "2 DATE @#DJU<caret>LIAN@ 1 JAN 1700", ::doubleClick),
        )
    }

    fun testAnEmailAddressSelectsAsThePlatformSelectsIt() {
        assertEquals(
            "1 EMAIL <selection>john</selection>@example.com",
            run("ged", "1 EMAIL jo<caret>hn@example.com", ::doubleClick),
        )
    }

    fun testAPlainTextFileSplitsTheXref() {
        assertEquals("1 HUSB @<selection>I1</selection>@", run("txt", "1 HUSB @I<caret>1@", ::doubleClick))
    }

    private fun doubleClick(editor: Editor) = editor.caretModel.currentCaret.selectWordAtCaret(false)

    private fun run(
        extension: String,
        marked: String,
        actionId: String,
    ): String = run(extension, marked) { EditorTestUtil.executeAction(it, actionId) }

    private fun run(
        extension: String,
        marked: String,
        action: (Editor) -> Unit,
    ): String {
        val file = myFixture.addFileToProject("file${fileCount++}.$extension", "")
        val document = checkNotNull(PsiDocumentManager.getInstance(project).getDocument(file))
        val editor = EditorFactory.getInstance().createEditor(document, project)
        try {
            WriteCommandAction.runWriteCommandAction(project) { document.setText(marked) }
            val markers = EditorTestUtil.extractCaretAndSelectionMarkers(document)
            PsiDocumentManager.getInstance(project).commitAllDocuments()
            EditorTestUtil.setCaretsAndSelection(editor, markers)
            action(editor)
            assertEmpty(LanguageServiceAccessor.getInstance(project).startedServers)
            return render(editor)
        } finally {
            EditorFactory.getInstance().releaseEditor(editor)
        }
    }

    private fun render(editor: Editor): String {
        val markers =
            editor.caretModel.allCarets.flatMap { caret ->
                if (caret.hasSelection()) {
                    listOf(caret.selectionStart to 0, caret.selectionEnd to 2)
                } else {
                    listOf(caret.offset to 1)
                }
            }
        val names = listOf("<selection>", "<caret>", "</selection>")
        val text = editor.document.text
        return buildString {
            var from = 0
            for ((offset, kind) in markers.sortedWith(compareBy({ it.first }, { it.second }))) {
                append(text, from, offset)
                append(names[kind])
                from = offset
            }
            append(text, from, text.length)
        }
    }

    private companion object {
        const val SELECT_WORD = IdeActions.ACTION_EDITOR_SELECT_WORD_AT_CARET
    }
}
