import { Client, ClientChannel, SFTPWrapper } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { CONFIG_FILE } from './config.js';
import os from 'os';

interface SSHConfig {
  host: string;
  username: string;
  privateKeyPath: string;
  port: number;
}

// Define an interface for the config file structure
interface ConfigFile {
  blockedCommands?: string[];
  allowedDirectories?: string[];
  ssh?: SSHConfig;
  [key: string]: any;
}

// Default SSH config for fallback
const DEFAULT_SSH_CONFIG: SSHConfig = {
  host: 'localhost',
  username: os.userInfo().username,
  privateKeyPath: path.join(os.homedir(), '.ssh', 'id_rsa'),
  port: 22
};

class SSHClient {
  private client: Client | null = null;
  private config: SSHConfig;
  private isConnected: boolean = false;
  private sftp: SFTPWrapper | null = null;

  constructor() {
    // Initialize with default config
    this.config = {...DEFAULT_SSH_CONFIG};
    
    // Try to load from config file
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(configData) as ConfigFile;
        
        // Update config if SSH settings exist and are complete
        if (config.ssh && 
            config.ssh.host && 
            config.ssh.username && 
            config.ssh.privateKeyPath && 
            config.ssh.port) {
          this.config = config.ssh;
        } else {
          console.warn('Incomplete SSH configuration in config.json. Using defaults or creating new config.');
          this.createDefaultConfig();
        }
      } else {
        console.warn('No config.json file found. Creating default configuration.');
        this.createDefaultConfig();
      }
    } catch (error) {
      console.error('Error loading SSH config:', error);
      this.createDefaultConfig();
    }
  }

  // Create a default config file if it doesn't exist
  private createDefaultConfig(): void {
    try {
      // Create default config
      const defaultConfig: ConfigFile = {
        blockedCommands: [],
        allowedDirectories: [
          "/tmp",
          path.join("/home", os.userInfo().username)
        ],
        ssh: DEFAULT_SSH_CONFIG
      };

      // Check if file exists
      if (!fs.existsSync(CONFIG_FILE)) {
        // Create the file with default config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8');
        console.log('Created default config.json file');
      } else {
        // Read existing config and update only missing parts
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        let existingConfig = JSON.parse(configData) as ConfigFile;
        
        // Update or add SSH config
        existingConfig = {
          ...existingConfig,
          ssh: existingConfig.ssh ? {...DEFAULT_SSH_CONFIG, ...existingConfig.ssh} : DEFAULT_SSH_CONFIG,
          allowedDirectories: existingConfig.allowedDirectories || defaultConfig.allowedDirectories,
          blockedCommands: existingConfig.blockedCommands || []
        };
        
        // Write back to file
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(existingConfig, null, 2), 'utf-8');
        console.log('Updated config.json with missing defaults');
        
        // Update current config
        if (existingConfig.ssh) {
          this.config = existingConfig.ssh;
        }
      }
    } catch (error) {
      console.error('Error creating default config:', error);
      // Continue with hard-coded default
    }
  }

  // Method to update config (for example, from UI)
  async updateConfig(newConfig: Partial<SSHConfig>): Promise<void> {
    try {
      // Read existing config
      let config: ConfigFile = {};
      if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        config = JSON.parse(configData) as ConfigFile;
      }

      // Update SSH config
      const updatedConfig = {
        ...config,
        ssh: {
          ...(config.ssh || {}),
          ...newConfig
        }
      };

      // Write updated config
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
      
      // Update current config
      this.config = {
        ...this.config,
        ...newConfig
      };

      // Disconnect if connected, so next connect() will use new config
      if (this.isConnected) {
        await this.disconnect();
      }
    } catch (error) {
      console.error('Error updating SSH config:', error);
      throw new Error(`Failed to update SSH configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      try {
        this.client = new Client();
        
        // Read the private key
        const privateKey = fs.readFileSync(this.config.privateKeyPath);
        
        this.client.on('ready', () => {
          this.isConnected = true;
          resolve();
        });
        
        this.client.on('error', (err) => {
          console.error('SSH connection error:', err);
          this.isConnected = false;
          reject(err);
        });
        
        // Connect with the configuration
        this.client.connect({
          host: this.config.host,
          port: this.config.port,
          username: this.config.username,
          privateKey
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getSFTP(): Promise<SFTPWrapper> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (this.sftp) return this.sftp;

    return new Promise<SFTPWrapper>((resolve, reject) => {
      this.client!.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }
        this.sftp = sftp;
        resolve(sftp);
      });
    });
  }

  async executeCommand(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client!.exec(command, (err, channel) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        channel.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        channel.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        channel.on('close', (code: number) => {
          resolve({ stdout, stderr, code });
        });
      });
    });
  }

  async executeCommandStream(command: string, onData: (data: string) => void, onError: (data: string) => void): Promise<{ channel: ClientChannel; promise: Promise<number> }> {
    if (!this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client!.exec(command, (err, channel) => {
        if (err) {
          reject(err);
          return;
        }

        channel.on('data', (data: Buffer) => {
          onData(data.toString());
        });

        channel.stderr.on('data', (data: Buffer) => {
          onError(data.toString());
        });

        const promise = new Promise<number>((resolveClose) => {
          channel.on('close', (code: number) => {
            resolveClose(code);
          });
        });

        resolve({ channel, promise });
      });
    });
  }

  async readFile(remotePath: string): Promise<string> {
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      let content = '';
      const readStream = sftp.createReadStream(remotePath);

      readStream.on('data', (data: Buffer) => {
        content += data.toString();
      });

      readStream.on('end', () => {
        resolve(content);
      });

      readStream.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  async writeFile(remotePath: string, content: string): Promise<void> {
    const sftp = await this.getSFTP();

    return new Promise((resolve, reject) => {
      const writeStream = sftp.createWriteStream(remotePath);

      writeStream.on('close', () => {
        resolve();
      });

      writeStream.on('error', (err: Error) => {
        reject(err);
      });

      writeStream.end(content);
    });
  }

  async listDirectory(remotePath: string): Promise<{ filename: string; longname: string; attrs: any }[]> {
    const sftp = await this.getSFTP();
    const readdir = promisify<string, any[]>(sftp.readdir).bind(sftp);
    return readdir(remotePath);
  }

  async stat(remotePath: string): Promise<any> {
    const sftp = await this.getSFTP();
    const stat = promisify(sftp.stat).bind(sftp);
    return stat(remotePath);
  }

  async mkdir(remotePath: string, recursive: boolean = true): Promise<void> {
    if (recursive) {
      // Use command line for recursive directory creation
      const { code, stderr } = await this.executeCommand(`mkdir -p "${remotePath}"`);
      if (code !== 0) {
        throw new Error(`Failed to create directory: ${stderr}`);
      }
      return;
    }

    const sftp = await this.getSFTP();
    const mkdir = promisify(sftp.mkdir).bind(sftp);
    return mkdir(remotePath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const sftp = await this.getSFTP();
    const rename = promisify(sftp.rename).bind(sftp);
    return rename(oldPath, newPath);
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    
    return new Promise((resolve) => {
      this.client!.on('end', () => {
        this.isConnected = false;
        this.client = null;
        this.sftp = null;
        resolve();
      });
      
      this.client!.end();
    });
  }

  // Get current SSH config
  getConfig(): SSHConfig {
    return { ...this.config };
  }
}

// Create a singleton instance
export const sshClient = new SSHClient();

export default sshClient;