# Claude Desktop Commander MCP with SSH Support

[![npm downloads](https://img.shields.io/npm/dw/@wonderwhy-er/desktop-commander)](https://www.npmjs.com/package/@wonderwhy-er/desktop-commander)
[![smithery badge](https://smithery.ai/badge/@wonderwhy-er/desktop-commander)](https://smithery.ai/server/@wonderwhy-er/desktop-commander)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg)](https://www.buymeacoffee.com/wonderwhyer)

Short version. Two key things. Terminal commands and diff based file editing, now with SSH support for remote execution.

<a href="https://glama.ai/mcp/servers/zempur9oh4">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/zempur9oh4/badge" alt="Claude Desktop Commander MCP server" />
</a>

## Table of Contents
- [Features](#features)
- [Installation](#installation)
- [SSH Configuration](#ssh-configuration)
- [Usage](#usage)
- [Handling Long-Running Commands](#handling-long-running-commands)
- [SSH Remote Execution](#ssh-remote-execution)
- [Work in Progress and TODOs](#work-in-progress-and-todos)
- [Media links](#media)
- [Testimonials](#testimonials)
- [Contributing](#contributing)
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

SSH configuration is handled in the `config.ts` file:

```typescript
// In config.ts
export const DEFAULT_SSH_CONFIG = {
  host: 'your-server-ip',
  username: 'your-username',
  privateKeyPath: '/path/to/your/private/key',
  port: 22
};
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
- `block_command`/`unblock_command`: Manage command blacklist

### Filesystem Tools
- `read_file`/`write_file`: File operations
- `create_directory`/`list_directory`: Directory management  
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

Created as part of exploring Claude MCPs: https://youtube.com/live/TlbjFDbl5Us

## Work in Progress and TODOs

The following features are currently being developed or planned:

- **Better code search** ([in progress](https://github.com/wonderwhy-er/ClaudeDesktopCommander/pull/17)) - Enhanced code exploration with context-aware results
- **Better configurations** ([in progress](https://github.com/wonderwhy-er/ClaudeDesktopCommander/pull/16)) - Improved settings for allowed paths, commands and shell environment
- **Windows environment fixes** ([in progress](https://github.com/wonderwhy-er/ClaudeDesktopCommander/pull/13)) - Resolving issues specific to Windows platforms
- **Linux improvements** ([in progress](https://github.com/wonderwhy-er/ClaudeDesktopCommander/pull/12)) - Enhancing compatibility with various Linux distributions
- **Support for WSL** - Windows Subsystem for Linux integration
- ~~**Support for SSH**~~ - ✅ Implemented! Remote server command execution
- **Installation troubleshooting guide** - Comprehensive help for setup issues

## Media
Learn more about this project through these resources:

### Article
[Claude with MCPs replaced Cursor & Windsurf. How did that happen?](https://wonderwhy-er.medium.com/claude-with-mcps-replaced-cursor-windsurf-how-did-that-happen-c1d1e2795e96) - A detailed exploration of how Claude with Model Context Protocol capabilities is changing developer workflows.

### Video
[Claude Desktop Commander Video Tutorial](https://www.youtube.com/watch?v=ly3bed99Dy8) - Watch how to set up and use the Commander effectively.

## Testimonials

[![img.png](testemonials/img.png) https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyyBt6_ShdDX_rIOad4AaABAg
](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyyBt6_ShdDX_rIOad4AaABAg
)

[![img_1.png](testemonials/img_1.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgztdHvDMqTb9jiqnf54AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgztdHvDMqTb9jiqnf54AaABAg
)

[![img_2.png](testemonials/img_2.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyQFTmYLJ4VBwIlmql4AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=UgyQFTmYLJ4VBwIlmql4AaABAg)

[![img_3.png](testemonials/img_3.png)
https://www.youtube.com/watch?v=ly3bed99Dy8&lc=Ugy4-exy166_Ma7TH-h4AaABAg](https://www.youtube.com/watch?v=ly3bed99Dy8&lc=Ugy4-exy166_Ma7TH-h4AaABAg)

[![img_4.png](testemonials/img_4.png)
https://medium.com/@pharmx/you-sir-are-my-hero-62cff5836a3e](https://medium.com/@pharmx/you-sir-are-my-hero-62cff5836a3e)

## Contributing

If you find this project useful, please consider giving it a ⭐ star on GitHub! This helps others discover the project and encourages further development.

We welcome contributions from the community! Whether you've found a bug, have a feature request, or want to contribute code, here's how you can help:

- **Found a bug?** Open an issue at [github.com/rihokirss/ClaudeDesktopCommander/issues](https://github.com/rihokirss/ClaudeDesktopCommander/issues)
- **Have a feature idea?** Submit a feature request in the issues section
- **Want to contribute code?** Fork the repository, create a branch, and submit a pull request
- **Questions or discussions?** Start a discussion in the GitHub Discussions tab

All contributions, big or small, are greatly appreciated!

If you find this tool valuable for your workflow, please consider [supporting the original project](https://www.buymeacoffee.com/wonderwhyer).

## License

MIT