package domorium.jetbrains

import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.psi.PsiFile
import com.redhat.devtools.lsp4ij.features.semanticTokens.DefaultSemanticTokensColorsProvider
import com.redhat.devtools.lsp4ij.features.semanticTokens.SemanticTokensColorsProvider

/**
 * LSP4IJ paints a `variable` with the key it gives a local variable, which no
 * bundled scheme colours, and it has no declaration key for a variable at all —
 * so every pointer arrived the colour of ordinary text and a declared one looked
 * like a reference. The keys named here belong to the platform, so the reader's
 * scheme still decides the colour; both are painted by every bundled scheme and
 * neither carries an underline. The rest is left to LSP4IJ.
 */
class GedcomSemanticTokensColorsProvider : SemanticTokensColorsProvider {
    private val fallback = DefaultSemanticTokensColorsProvider()

    override fun getTextAttributesKey(
        tokenType: String,
        tokenModifiers: List<String>,
        file: PsiFile,
    ): TextAttributesKey? =
        pointerAttributesKey(tokenType, tokenModifiers)
            ?: fallback.getTextAttributesKey(tokenType, tokenModifiers, file)
}

internal const val POINTER_TOKEN_TYPE = "variable"

internal const val DECLARATION_MODIFIER = "declaration"

/** Null for anything but a pointer, which is LSP4IJ's to paint. */
internal fun pointerAttributesKey(
    tokenType: String,
    tokenModifiers: List<String>,
): TextAttributesKey? =
    when {
        tokenType != POINTER_TOKEN_TYPE -> null
        tokenModifiers.contains(DECLARATION_MODIFIER) -> DefaultLanguageHighlighterColors.FUNCTION_DECLARATION
        else -> DefaultLanguageHighlighterColors.INSTANCE_FIELD
    }
