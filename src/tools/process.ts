import { ProcessInfo } from '../types.js';
import { KillProcessArgsSchema } from './schemas.js';
import { sshClient } from '../ssh-client.js';

export async function listProcesses(): Promise<{content: Array<{type: string, text: string}>}> {
  try {
    // Ensure SSH connection is established
    await sshClient.connect();
    
    // Execute ps command on remote Linux server
    const { stdout, code } = await sshClient.executeCommand('ps aux');
    if (code !== 0) {
      throw new Error('Failed to list processes on remote server');
    }
    
    // Parse the output
    const processes = stdout.split('\n')
      .slice(1) // Skip header row
      .filter(Boolean)
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          pid: parseInt(parts[1], 10),
          command: parts.slice(10).join(' '), // Command is usually field 11+
          cpu: parts[2] + '%',
          memory: parts[3] + '%',
        } as ProcessInfo;
      });

    return {
      content: [{
        type: "text",
        text: processes.map(p =>
          `PID: ${p.pid}, Command: ${p.command}, CPU: ${p.cpu}, Memory: ${p.memory}`
        ).join('\n')
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to list processes: ${errorMessage}`);
  }
}

export async function killProcess(args: unknown) {
  const parsed = KillProcessArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for kill_process: ${parsed.error}`);
  }

  try {
    // Ensure SSH connection is established
    await sshClient.connect();
    
    // Send kill signal to process on remote server
    const { code, stderr } = await sshClient.executeCommand(`kill -9 ${parsed.data.pid}`);
    if (code !== 0) {
      throw new Error(`Failed to kill process: ${stderr}`);
    }
    
    return {
      content: [{ type: "text", text: `Successfully terminated process ${parsed.data.pid} on remote server` }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to kill process: ${errorMessage}`);
  }
}