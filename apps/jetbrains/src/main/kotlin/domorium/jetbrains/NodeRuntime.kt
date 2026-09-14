package domorium.jetbrains

import com.intellij.openapi.util.SystemInfo
import com.intellij.util.EnvironmentUtil
import java.io.File

internal const val MISSING_NODE_MESSAGE =
    "Node.js was not found on PATH, so the GEDCOM language server cannot start. " +
        "An IDE opened from Spotlight, the Dock or Toolbox does not inherit a login " +
        "shell's PATH, which is where a version manager usually puts node."

internal object NodeRuntime {
    private val NAMES: List<String> =
        if (SystemInfo.isWindows) listOf("node.exe", "node.cmd", "node") else listOf("node")

    fun locate(find: (String) -> File? = { findOnPath(it, EnvironmentUtil.getValue("PATH")) }): File? = NAMES.firstNotNullOfOrNull(find)

    fun findOnPath(
        name: String,
        path: String?,
    ): File? =
        path
            ?.splitToSequence(File.pathSeparatorChar)
            ?.filter { it.isNotBlank() }
            ?.map { File(it, name) }
            ?.firstOrNull { it.isFile && it.canExecute() }
}
