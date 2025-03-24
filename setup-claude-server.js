import { homedir, platform } from 'os';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Define paths directly instead of importing from config
const LOG_FILE = join(projectRoot, 'server.log');

// Determine OS and set appropriate claude config path
const isWindows = platform() === 'win32';
const claudeConfigPath = isWindows
    ? join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')
    : join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

function log(message, isError = false) {
    const prefix = isError ? 'ERROR: ' : '';
    console.log(`${prefix}${message}`);
}

// Check if Claude config file exists and create default if not
if (!existsSync(claudeConfigPath)) {
    log(`Claude config file not found at: ${claudeConfigPath}`);
    log('Creating default Claude config file...');
    
    // Create the directory if it doesn't exist
    const configDir = dirname(claudeConfigPath);
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    
    // Create default config
    const defaultConfig = {
        "serverConfig": isWindows
            ? {
                "command": "cmd.exe",
                "args": ["/c"]
              }
            : {
                "command": "/bin/sh",
                "args": ["-c"]
              }
    };
    
    writeFileSync(claudeConfigPath, JSON.stringify(defaultConfig, null, 2));
    log('Default Claude config file created.');
}

try {
    // Read existing Claude config
    const configData = readFileSync(claudeConfigPath, 'utf8');
    const config = JSON.parse(configData);

    // Prepare the server config
    const serverConfig = {
        "command": "node",
        "args": [
            join(projectRoot, 'dist', 'index.js')
        ],
        "cwd": projectRoot
    };

    // Add or update the MCP server config
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    // Use "remoteCommander" as the MCP server name
    config.mcpServers.remoteCommander = serverConfig;

    // Write the updated config back
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
    
    log('Successfully added MCP server to Claude configuration!');
    log(`Claude config: ${claudeConfigPath}`);
    log('\nSetup completed successfully!');
    log('1. SSH settings are configured in config.ts file');
    log('2. Restart Claude if it\'s currently running');
    log('3. The "remoteCommander" will be available in Claude\'s MCP server list');
    
} catch (error) {
    log(`Error during setup: ${error}`, true);
    process.exit(1);
}