package domorium.jetbrains

import com.intellij.execution.configurations.PathEnvironmentVariableUtil
import com.intellij.openapi.util.SystemInfo
import java.io.File

internal const val MISSING_NODE_MESSAGE =
    "Node.js was not found on PATH, so the GEDCOM language server cannot start. " +
        "An IDE opened from Spotlight, the Dock or Toolbox does not inherit a login " +
        "shell's PATH, which is where a version manager usually puts node."

/** An IDE not started from a shell has its own PATH, whatever the terminal has. #162 */
internal object NodeRuntime {
    private val NAMES: List<String> =
        if (SystemInfo.isWindows) listOf("node.exe", "node.cmd", "node") else listOf("node")

    fun locate(find: (String) -> File? = { PathEnvironmentVariableUtil.findInPath(it) }): File? = NAMES.firstNotNullOfOrNull(find)
}
