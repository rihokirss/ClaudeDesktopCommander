
## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [SSH Configuration](#ssh-configuration)
- [Usage](#usage)
- [Handling Long-Running Commands](#handling-long-running-commands)
- [SSH Remote Execution](#ssh-remote-execution)
- [License](#license)

This server allows the Claude desktop app to execute long-running terminal commands on a remote Linux server through SSH, and manage processes through Model Context Protocol (MCP). Built on top of [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) to provide additional search and replace file editing capabilities.

## Features

- Execute terminal commands with output streaming
- Command timeout and background execution support
- Process management (list and kill processes)
- Session management for long-running commands
- **Remote SSH execution** - Run commands on remote Linux machines
- Full filesystem operations:
  - Read/write files
  - Create/list directories
  - Move files/directories
  - Search files
  - Get file metadata
  - Code editing capabilities:
  - Surgical text replacements for small changes
  - Full file rewrites for major changes
  - Multiple file support
  - Pattern-based replacements

## Installation
First, ensure you've downloaded and installed the [Claude Desktop app](https://claude.ai/download) and you have [npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Installing the SSH-enabled fork

```bash
# Clone the repository
git clone https://github.com/rihokirss/ClaudeDesktopCommander.git
cd ClaudeDesktopCommander

# Install dependencies
npm install

# Build the project
npm run build

# Set up Claude Desktop integration
node dist/setup-claude-server.js
```

Restart Claude Desktop if it's already running.

## SSH Configuration

SSH configuration is handled in the `config.json` file, which is created automatically during setup:

```json
{
  "blockedCommands": [...],
  "allowedDirectories": [
    "/tmp",
    "/home/your-username" 
  ],
  "ssh": {
    "host": "your-server-ip",
    "username": "your-username",
    "privateKeyPath": "~/.ssh/id_rsa",
    "port": 22
  }
}
```

Customize these settings before building the project:
- `host`: IP address or hostname of your remote server
- `username`: Your SSH username
- `privateKeyPath`: Full path to your private key file
  - Windows example: `"C:\\Users\\YourUsername\\.ssh\\id_rsa"` (use double backslashes)
  - Mac/Linux example: `"/home/username/.ssh/id_rsa"` or `"~/.ssh/id_rsa"`
- `port`: SSH port (usually 22)

After updating the SSH settings in `config.ts`, rebuild the project with `npm run build` and restart Claude Desktop.

You can also update SSH settings at runtime using the `update_ssh_config` tool within Claude.

## Usage

The server provides these tool categories:

### Terminal Tools
- `execute_command`: Run commands with configurable timeout
- `read_output`: Get output from long-running commands
- `force_terminate`: Stop running command sessions
- `list_sessions`: View active command sessions
- `list_processes`: View system processes
- `kill_process`: Terminate processes by PID
- `block_command` / `unblock_command`: Manage command blacklist

### Filesystem Tools
- `read_file` / `write_file`: File operations
- `create_directory` / `list_directory`: Directory management  
- `move_file`: Move/rename files
- `search_files`: Pattern-based file search
- `get_file_info`: File metadata

### SSH Tools
- `update_ssh_config`: Update SSH connection settings
- `get_ssh_config`: View current SSH configuration

### Edit Tools
- `edit_block`: Apply surgical text replacements (best for changes <20% of file size)
- `write_file`: Complete file rewrites (best for large changes >20% or when edit_block fails)

Search/Replace Block Format:
```
filepath.ext
<<<<<<< SEARCH
existing code to replace
=======
new code to insert
>>>>>>> REPLACE
```

Example:
```
src/main.js
<<<<<<< SEARCH
console.log("old message");
=======
console.log("new message");
>>>>>>> REPLACE
```

## Handling Long-Running Commands

For commands that may take a while:

1. `execute_command` returns after timeout with initial output
2. Command continues in background
3. Use `read_output` with PID to get new output
4. Use `force_terminate` to stop if needed

## SSH Remote Execution

All commands and file operations are executed on the remote server configured in your SSH settings:

### Using SSH Tools

- `update_ssh_config`: Update SSH connection settings during a session
```
// Example
{
  "host": "new-server.example.com",
  "username": "newuser" 
}
```

- `get_ssh_config`: View current SSH configuration

### Troubleshooting SSH

- Verify your SSH key has the correct permissions (600) on Unix-like systems
- Make sure all paths in the config use the correct format for your OS
- Confirm your SSH username and private key are correct
- Ensure your SSH user has appropriate permissions on the remote server

## Model Context Protocol Integration

This project extends the MCP Filesystem Server to enable:
- Local server support in Claude Desktop
- Full system command execution
- Process management
- File operations
- Code editing with search/replace blocks
- Remote SSH execution

## License

MIT