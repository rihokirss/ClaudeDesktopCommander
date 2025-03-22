import fs from 'fs/promises';
import { CONFIG_FILE } from './config.js';

class CommandManager {
  private blockedCommands: Set<string> = new Set();

  async loadBlockedCommands(): Promise<void> {
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      // Load just the blockedCommands from the config
      if (config.blockedCommands) {
        this.blockedCommands = new Set(config.blockedCommands);
      } else {
        this.blockedCommands = new Set();
      }
    } catch (error) {
      this.blockedCommands = new Set();
    }
  }

  async saveBlockedCommands(): Promise<void> {
    try {
      // Read existing config to preserve other settings
      let config = {};
      try {
        const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        // If file doesn't exist or can't be parsed, use empty config
      }

      // Update just the blockedCommands
      config = {
        ...config,
        blockedCommands: Array.from(this.blockedCommands)
      };

      await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving blockedCommands:', error);
    }
  }

  validateCommand(command: string): boolean {
    const baseCommand = command.split(' ')[0].toLowerCase().trim();
    return !this.blockedCommands.has(baseCommand);
  }

  async blockCommand(command: string): Promise<boolean> {
    command = command.toLowerCase().trim();
    if (this.blockedCommands.has(command)) {
      return false;
    }
    this.blockedCommands.add(command);
    await this.saveBlockedCommands();
    return true;
  }

  async unblockCommand(command: string): Promise<boolean> {
    command = command.toLowerCase().trim();
    if (!this.blockedCommands.has(command)) {
      return false;
    }
    this.blockedCommands.delete(command);
    await this.saveBlockedCommands();
    return true;
  }

  listBlockedCommands(): string[] {
    return Array.from(this.blockedCommands).sort();
  }
}

export const commandManager = new CommandManager();