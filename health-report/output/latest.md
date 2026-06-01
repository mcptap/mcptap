# MCP Health Report — 2026-06-01

Automated weekly run of [mcptap](https://github.com/mcptap/mcptap) against 5 community MCP servers. Each server is spawned, `tools/list` is called, and tool descriptions are deterministically scored. No authenticated tool calls; this report measures *surface health*, not behavioral correctness.

## Summary

- Servers reachable: **5 / 5**
- Total tools surfaced: **65**
- Average tool-description quality: **88 / 100**
- Total tokens across all surfaces: **9,797**

## Results

| Server | Status | Tools | Score | Tokens | Duration |
| --- | --- | --- | --- | --- | --- |
| `@modelcontextprotocol/filesystem` | ✅ ok | 14 | 🟡 82 | 1613 | 4.6s |
| `@modelcontextprotocol/everything` | ✅ ok | 13 | 🟢 97 | 1106 | 3.1s |
| `@modelcontextprotocol/memory` | ✅ ok | 9 | 🟢 89 | 868 | 2.6s |
| `@modelcontextprotocol/sequential-thinking` | ✅ ok | 1 | 🟡 75 | 849 | 2.7s |
| `@jcornudella/zoomdocs-mcp` | ✅ ok | 28 | 🟢 97 | 5361 | 4.1s |

## Reachable servers

### `@modelcontextprotocol/filesystem`

_Read/write/list files under a sandboxed root._

- Tools (14): `read_file`, `read_text_file`, `read_media_file`, `read_multiple_files`, `write_file`, `edit_file`, `create_directory`, `list_directory`, `list_directory_with_sizes`, `directory_tree`, `move_file`, `search_files`, `get_file_info`, `list_allowed_directories`
- Average quality: 🟡 82
- Tokens (whole tool surface): 1613

### `@modelcontextprotocol/everything`

_Reference server demonstrating every MCP capability._

- Tools (13): `echo`, `get-annotated-message`, `get-env`, `get-resource-links`, `get-resource-reference`, `get-structured-content`, `get-sum`, `get-tiny-image`, `gzip-file-as-resource`, `toggle-simulated-logging`, `toggle-subscriber-updates`, `trigger-long-running-operation`, `simulate-research-query`
- Average quality: 🟢 97
- Tokens (whole tool surface): 1106

### `@modelcontextprotocol/memory`

_Knowledge-graph memory persisted to a JSON file._

- Tools (9): `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations`, `read_graph`, `search_nodes`, `open_nodes`
- Average quality: 🟢 89
- Tokens (whole tool surface): 868

### `@modelcontextprotocol/sequential-thinking`

_Structured multi-step reasoning tool._

- Tools (1): `sequentialthinking`
- Average quality: 🟡 75
- Tokens (whole tool surface): 849

### `@jcornudella/zoomdocs-mcp`

_Joan’s own MCP server — included as a control sample._

- Tools (28): `zoomdocs_login`, `zoomdocs_status`, `zoomdocs_search`, `zoomdocs_list`, `zoomdocs_get_metadata`, `zoomdocs_get_edit_outline`, `zoomdocs_get_access_info`, `zoomdocs_get_comments`, `zoomdocs_add_doc_comment`, `zoomdocs_reply_to_comment`, `zoomdocs_resolve_comment_thread`, `zoomdocs_reopen_comment_thread`, `zoomdocs_delete_comment`, `zoomdocs_add_inline_comment`, `zoomdocs_add_comment_reaction`, `zoomdocs_search_share_targets`, `zoomdocs_set_link_access`, `zoomdocs_add_user_collaborator`, `zoomdocs_set_user_collaborator_role`, `zoomdocs_remove_user_collaborator`, `zoomdocs_read`, `zoomdocs_create_doc`, `zoomdocs_edit_doc`, `zoomdocs_edit_doc_batch`, `zoomdocs_create_replacement_copy`, `zoomdocs_delete`, `zoomdocs_move`, `zoomdocs_rename`
- Average quality: 🟢 97
- Tokens (whole tool surface): 5361

---

_Run by [mcptap](https://github.com/mcptap/mcptap) on 2026-06-01T15:31:44.768Z. Want your server here? Open an issue at [mcptap/mcptap/issues](https://github.com/mcptap/mcptap/issues)._
