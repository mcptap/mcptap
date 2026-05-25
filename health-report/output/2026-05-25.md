# MCP Health Report — 2026-05-25

Automated weekly run of [mcptap](https://github.com/mcptap/mcptap) against 5 community MCP servers. Each server is spawned, `tools/list` is called, and tool descriptions are deterministically scored. No authenticated tool calls; this report measures *surface health*, not behavioral correctness.

## Summary

- Servers reachable: **5 / 5**
- Total tools surfaced: **53**
- Average tool-description quality: **88 / 100**
- Total tokens across all surfaces: **6,357**

## Results

| Server | Status | Tools | Score | Tokens | Duration |
| --- | --- | --- | --- | --- | --- |
| `@modelcontextprotocol/filesystem` | ✅ ok | 14 | 🟡 82 | 1613 | 4.7s |
| `@modelcontextprotocol/everything` | ✅ ok | 13 | 🟢 97 | 1106 | 3.0s |
| `@modelcontextprotocol/memory` | ✅ ok | 9 | 🟢 89 | 868 | 2.2s |
| `@modelcontextprotocol/sequential-thinking` | ✅ ok | 1 | 🟡 75 | 849 | 2.5s |
| `@jcornudella/zoomdocs-mcp` | ✅ ok | 16 | 🟢 99 | 1921 | 3.7s |

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

- Tools (16): `zoomdocs_login`, `zoomdocs_status`, `zoomdocs_search`, `zoomdocs_list`, `zoomdocs_get_metadata`, `zoomdocs_read`, `zoomdocs_write`, `zoomdocs_capture_start`, `zoomdocs_capture_stop`, `zoomdocs_capture_status`, `zoomdocs_delete`, `zoomdocs_move`, `zoomdocs_list_blocks`, `zoomdocs_append_to_block`, `zoomdocs_replace_block_text`, `zoomdocs_rename`
- Average quality: 🟢 99
- Tokens (whole tool surface): 1921

---

_Run by [mcptap](https://github.com/mcptap/mcptap) on 2026-05-25T12:38:42.450Z. Want your server here? Open an issue at [mcptap/mcptap/issues](https://github.com/mcptap/mcptap/issues)._
