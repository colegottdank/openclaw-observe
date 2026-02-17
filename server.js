import express from 'express';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { exec, spawn } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

// WORKSPACE ROOT (The entire .openclaw directory)
const ROOT_DIR = path.resolve(__dirname, '../'); 
const WORKSPACE_ROOT = ROOT_DIR;
const AGENTS_ROOT = path.join(ROOT_DIR, 'agents');

console.log('Serving files from:', WORKSPACE_ROOT);
console.log('Agents root:', AGENTS_ROOT);

// --- FILES API ---

app.get('/api/files', async (req, res) => {
  try {
    const relativePath = req.query.path || 'workspace'; 
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(WORKSPACE_ROOT, safePath);

    if (!fullPath.startsWith(ROOT_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const list = await Promise.all(entries.map(async (f) => {
        let updatedAt;
        try {
          const st = await fs.stat(path.join(fullPath, f.name));
          updatedAt = st.mtime.toISOString();
        } catch { updatedAt = null; }
        return {
          name: f.name,
          isDirectory: f.isDirectory(),
          path: path.join(relativePath, f.name),
          updatedAt,
        };
      }));
      res.json({ type: 'directory', files: list });
    } else {
      const content = await fs.readFile(fullPath, 'utf-8');
      res.json({ type: 'file', content, path: relativePath });
    }
  } catch (err) {
    console.error('Error reading file:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/files', async (req, res) => {
  try {
    const { path: relativePath, content } = req.body;
    if (!relativePath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(WORKSPACE_ROOT, safePath);

    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.writeFile(fullPath, content, 'utf-8');
    console.log('Saved file:', relativePath);
    res.json({ success: true });
  } catch (err) {
    console.error('Error writing file:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- SESSIONS API ---

const CHANNEL_MAP = {
  '1468421608707461325': '#atlas-ceo',
  '1469615895021093029': '#forge-backend',
  '1469615896505880657': '#pixel-frontend',
  '1469615897948979402': '#echo-growth',
  '1470184543565647894': '#system-engineering',
  '1468748716205932596': '#mission-control',
  '1468534271130992732': '#voice-logs'
};

const sessionCache = { data: null, timestamp: 0, TTL: 5000 };

// In-memory cache for agents list
const agentsCache = { data: null, timestamp: 0, TTL: 10000 }; // 10s TTL

// In-memory cache for config
const configCache = { data: null, timestamp: 0, TTL: 60000 }; // 60s TTL, invalidated on patch

async function readFirstUserMessage(filePath) {
  try {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            if (entry.type === 'message' && entry.message?.role === 'user') {
                const content = entry.message.content;
                const text = Array.isArray(content) ? content.map(b => b.text).join(' ') : content;
                rl.close();
                fileStream.destroy();
                return text?.slice(0, 100) || null;
            }
        } catch (e) {}
    }
    rl.close();
    fileStream.destroy();
  } catch (e) { return null; }
  return null;
}

app.get('/api/sessions', async (req, res) => {
  try {
    const now = Date.now();
    if (sessionCache.data && (now - sessionCache.timestamp < sessionCache.TTL)) {
       const { agentId } = req.query;
       let result = [...sessionCache.data];
       if (agentId) result = result.filter(s => s.agentId === agentId);
       result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
       return res.json(result);
    }

    const agents = await fs.readdir(AGENTS_ROOT);
    const allSessions = [];

    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return;
      const sessionsDir = path.join(AGENTS_ROOT, agent, 'sessions');
      const sessionFile = path.join(sessionsDir, 'sessions.json');
      let foundSessions = false;

      try {
        const stats = await fs.stat(sessionFile);
        if (stats.isFile()) {
          const data = await fs.readFile(sessionFile, 'utf-8');
          const sessions = JSON.parse(data);
          Object.entries(sessions).forEach(([key, s]) => {
            let context = 'unknown';
            let channelName = null;
            if (s.deliveryContext?.channel === 'discord') {
                const chId = s.deliveryContext.to?.replace('channel:', '');
                channelName = CHANNEL_MAP[chId];
                context = channelName || `discord:${chId}`;
            } else if (key.includes('discord')) {
                const parts = key.split(':');
                const chId = parts[parts.length - 1];
                channelName = CHANNEL_MAP[chId];
                context = channelName || `discord:${chId}`;
            }
            allSessions.push({ ...s, key, agentId: agent, status: s.abortedLastRun ? 'aborted' : (s.active ? 'active' : 'completed'), displayName: context, channelName });
          });
          foundSessions = true;
        }
      } catch (e) {}

      if (!foundSessions || allSessions.filter(s => s.agentId === agent).length === 0) {
        try {
          const files = await fs.readdir(sessionsDir);
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
          const fileStats = await Promise.all(jsonlFiles.map(async (f) => {
             const fp = path.join(sessionsDir, f);
             const st = await fs.stat(fp);
             return { file: f, mtime: st.mtimeMs, birthtime: st.birthtimeMs, path: fp };
          }));
          fileStats.sort((a, b) => b.mtime - a.mtime);
          const recentFiles = fileStats.slice(0, 50);
          const enrichedSessions = await Promise.all(recentFiles.map(async (fsItem) => {
            const sessionId = fsItem.file.replace('.jsonl', '');
            const summary = await readFirstUserMessage(fsItem.path);
            return { sessionId, key: `agent:${agent}:${sessionId}`, agentId: agent, updatedAt: fsItem.mtime, status: 'unknown', createdAt: fsItem.birthtime, displayName: summary || 'No context', kind: 'file-scan', summary };
          }));
          allSessions.push(...enrichedSessions);
        } catch (e) {}
      }
    }));
    
    sessionCache.data = allSessions;
    sessionCache.timestamp = Date.now();

    const { agentId } = req.query;
    let result = [...allSessions];
    if (agentId) result = result.filter(s => s.agentId === agentId);
    result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json(result);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:agentId/:sessionId', async (req, res) => {
  const { agentId, sessionId } = req.params;
  if (!/^[a-zA-Z0-9-_]+$/.test(agentId) || !/^[a-zA-Z0-9-]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid ID format' });
  const sessionPath = path.resolve(AGENTS_ROOT, agentId, 'sessions', `${sessionId}.jsonl`);
  if (!sessionPath.startsWith(path.resolve(AGENTS_ROOT))) return res.status(403).json({ error: 'Access denied' });
  try {
    const stat = await fs.stat(sessionPath);
    const lastModified = stat.mtime.toUTCString();

    // Return 304 if file hasn't changed since client's cached version
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime) {
      return res.status(304).end();
    }

    const content = await fs.readFile(sessionPath, 'utf-8');
    res.set('Last-Modified', lastModified);
    res.set('Cache-Control', 'no-cache');
    res.type('text/plain').send(content);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Session log not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- AGENTS API ---

app.get('/api/agents', async (req, res) => {
  try {
    const now = Date.now();
    if (agentsCache.data && (now - agentsCache.timestamp < agentsCache.TTL)) {
       return res.json(agentsCache.data);
    }

    const configPath = path.join(os.homedir(), '.openclaw', 'clawdbot.json');
    let configuredAgents = [];
    try {
        const rawConfig = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(rawConfig);
        configuredAgents = config.agents?.list || [];
    } catch (e) {
        console.error('Failed to read configured agents:', e);
        return res.json([]);
    }

    const agentList = [];
    for (const agentConfig of configuredAgents) {
      const agentId = agentConfig.id;
      let agentDir = agentConfig.workspace || path.join(AGENTS_ROOT, agentId);
      let status = 'idle';
      let lastActive = null;
      
      try {
        const sessionsFile = path.join(agentDir, 'sessions', 'sessions.json');
        await fs.access(sessionsFile);
        const sessionData = await fs.readFile(sessionsFile, 'utf-8');
        const sessions = JSON.parse(sessionData);
        const activeSession = Object.values(sessions).find(s => s.active);
        if (activeSession) status = 'busy';
        const times = Object.values(sessions).map(s => s.updatedAt || 0);
        if (times.length > 0) lastActive = new Date(Math.max(...times)).toISOString();
      } catch (e) {}

      // Compute workspace path relative to WORKSPACE_ROOT for the frontend
      const absWorkspace = agentConfig.workspace || path.join(AGENTS_ROOT, agentId);
      const relWorkspace = path.relative(WORKSPACE_ROOT, absWorkspace);

      agentList.push({
        _id: agentId,
        name: agentConfig.identity?.name || (agentId.charAt(0).toUpperCase() + agentId.slice(1)),
        emoji: agentConfig.identity?.emoji,
        role: agentConfig.identity?.theme,
        status,
        lastActive,
        model: agentConfig.model || 'default',
        enabled: true,
        workspace: relWorkspace || '',
      });
    }
    agentsCache.data = agentList;
    agentsCache.timestamp = Date.now();
    res.json(agentList);
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- GATEWAY CONFIG & STATUS API ---

app.get('/api/gateway/config', async (req, res) => {
    const now = Date.now();
    if (configCache.data && (now - configCache.timestamp < configCache.TTL)) {
       return res.json(configCache.data);
    }

    const configPath = path.join(os.homedir(), '.openclaw', 'clawdbot.json');
    
    console.log(`[Config API] Request received`);
    console.log(`[Config API] Config path resolved to: ${configPath}`);
    
    try {
        // Check if file exists first
        let fileStats;
        try {
            fileStats = await fs.stat(configPath);
            console.log(`[Config API] File exists, size: ${fileStats.size} bytes`);
        } catch (statErr) {
            console.error(`[Config API] File not found at: ${configPath}`);
            console.error(`[Config API] Stat error: ${statErr.message}`);
            return res.status(404).json({ 
                error: 'Config file not found',
                path: configPath,
                details: statErr.message
            });
        }
        
        // Read the file
        let rawConfig;
        try {
            rawConfig = await fs.readFile(configPath, 'utf-8');
            console.log(`[Config API] File read successfully, ${rawConfig.length} characters`);
        } catch (readErr) {
            console.error(`[Config API] Failed to read file: ${readErr.message}`);
            return res.status(500).json({ 
                error: 'Failed to read config file',
                details: readErr.message
            });
        }
        
        // Parse JSON
        let config;
        try {
            config = JSON.parse(rawConfig);
            console.log(`[Config API] JSON parsed successfully`);
        } catch (parseErr) {
            console.error(`[Config API] JSON parse error: ${parseErr.message}`);
            console.error(`[Config API] Raw content preview: ${rawConfig.substring(0, 200)}...`);
            return res.status(500).json({ 
                error: 'Invalid JSON in config file',
                details: parseErr.message,
                preview: rawConfig.substring(0, 200)
            });
        }
        
        // Redact sensitive fields
        const redacted = JSON.parse(JSON.stringify(config)); 
        if (redacted.env) {
            for (const key in redacted.env) {
                if (key.includes('KEY') || key.includes('TOKEN') || key.includes('PASSWORD') || key.includes('SECRET')) {
                    redacted.env[key] = '********';
                }
            }
        }
        if (redacted.gateway?.auth?.password) redacted.gateway.auth.password = '********';
        if (redacted.gateway?.auth?.token) redacted.gateway.auth.token = '********';
        
        console.log(`[Config API] Successfully returning config with ${redacted.agents?.list?.length || 0} agents`);
        
        configCache.data = redacted;
        configCache.timestamp = Date.now();
        
        res.json(redacted);
        
    } catch (e) {
        console.error(`[Config API] Unexpected error: ${e.message}`);
        console.error(`[Config API] Stack trace:`, e.stack);
        res.status(500).json({ 
            error: 'Unexpected error reading config',
            details: e.message
        });
    }
});

app.patch('/api/gateway/config', async (req, res) => {
    const patch = req.body; 
    
    // Invalidate cache immediately
    configCache.data = null;
    agentsCache.data = null;

    const tmpFile = path.join(os.tmpdir(), `patch-${Date.now()}.json`);
    
    try {
        await fs.writeFile(tmpFile, JSON.stringify(patch));
        console.log('Applying config patch:', JSON.stringify(patch, null, 2));
        
        exec(`openclaw gateway config.patch --file "${tmpFile}"`, (error, stdout, stderr) => {
            // fs.unlink(tmpFile).catch(() => {}); // Keep for debug? No, delete
            if (error) {
                console.error(`Patch error: ${stderr || error.message}`);
                // Don't res.send here, already sent response? No.
            } else {
                console.log(`Patch applied: ${stdout}`);
            }
        });
        
        // Optimistic success
        res.json({ message: 'Config update queued' });
    } catch (error) {
        console.error('Config patch error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/gateway/status', (req, res) => {
    exec('openclaw gateway status --json', (error, stdout, stderr) => {
        if (error) {
            console.error('Status error:', stderr);
            return res.status(500).json({ error: stderr || error.message, status: 'offline' });
        }
        try {
            const rawStatus = JSON.parse(stdout);
            const pid = rawStatus.service?.runtime?.pid;
            
            if (!pid) {
                 return res.json({
                    status: 'offline',
                    pid: null,
                    port: rawStatus.gateway?.port,
                    version: 'unknown',
                    uptime: '0s',
                    requestsPerMin: 0,
                    activeConnections: 0,
                    memoryUsage: '0 MB'
                });
            }

            // Get uptime/memory via ps
            exec(`ps -p ${pid} -o rss,etime`, (psErr, psOut) => {
                let uptime = 'unknown';
                let memoryUsage = '0 MB';
                
                if (!psErr && psOut) {
                    const lines = psOut.trim().split('\n');
                    if (lines.length > 1) {
                        const parts = lines[1].trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const rss = parts[0];
                            const etime = parts[1];
                            // RSS is in KB
                            const memMB = Math.round(parseInt(rss) / 1024);
                            memoryUsage = `${memMB} MB`;
                            uptime = etime; // e.g. "32:15"
                        }
                    }
                }
                
                const status = {
                    status: rawStatus.service?.runtime?.status === 'running' ? 'online' : 'offline',
                    pid: pid,
                    port: rawStatus.gateway?.port,
                    version: rawStatus.service?.version || rawStatus.gateway?.version || undefined,
                    uptime: uptime,
                    memoryUsage: memoryUsage
                };
                
                res.json(status);
            });
        } catch (e) {
            res.status(500).json({ error: 'Failed to parse status JSON', raw: stdout });
        }
    });
});

app.post('/api/gateway/restart', async (req, res) => {
  try {
    console.log('Restarting gateway...');
    exec('openclaw gateway restart', (error, stdout, stderr) => {
        if (error) {
            console.error(`Restart error: ${error}`);
            return;
        }
        console.log(`Restart stdout: ${stdout}`);
    });
    res.json({ success: true, message: 'Gateway restart initiated' });
  } catch (err) {
    console.error('Error restarting gateway:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- LOGS & SWARM API ---

app.get('/api/gateway/logs', async (req, res) => {
  try {
    const lines = parseInt(req.query.lines) || 100;
    const logPath = path.join(ROOT_DIR, 'logs', 'gateway.log');

    // Check primary log path, then scan /tmp/openclaw/ for latest log
    let targetLog = logPath;
    try {
        await fs.access(logPath);
    } catch {
        try {
            const tmpDir = '/tmp/openclaw';
            const files = await fs.readdir(tmpDir);
            const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse();
            targetLog = logFiles.length > 0 ? path.join(tmpDir, logFiles[0]) : logPath;
        } catch {
            // No fallback found, use original path (will fail gracefully)
        }
    }

    const tail = spawn('tail', ['-n', lines.toString(), targetLog]);
    let output = '';
    tail.stdout.on('data', d => output += d.toString());
    tail.on('close', code => {
      res.json({ logs: output });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/swarm/activity', async (req, res) => {
  try {
    const windowHours = parseInt(req.query.window) || 1; 
    const now = Date.now();
    const windowStart = now - (windowHours * 60 * 60 * 1000);
    const activities = [];
    const agents = await fs.readdir(AGENTS_ROOT);
    
    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return;
      const sessionsDir = path.join(AGENTS_ROOT, agent, 'sessions');
      const sessionsFile = path.join(sessionsDir, 'sessions.json');
      try {
        const data = await fs.readFile(sessionsFile, 'utf-8');
        const sessions = JSON.parse(data);
        Object.entries(sessions).forEach(([key, session]) => {
          const start = session.createdAt || session.updatedAt - 60000;
          const end = session.updatedAt;
          if (end >= windowStart || start >= windowStart) {
            let label = session.label || 'Unknown task';
            if (label === 'Unknown task' && key.includes(':')) label = key.split(':').slice(2).join(':').replace(/^(discord|channel):?/, '');
            let status = 'completed';
            if (session.active || (now - end) < 60000) status = 'active';
            else if (session.abortedLastRun) status = 'aborted';
            activities.push({ agentId: agent, sessionId: session.sessionId, start, end, label, status, key });
          }
        });
      } catch (e) {}
    }));
    activities.sort((a, b) => b.start - a.start);
    res.json({ activities, window: { start: windowStart, end: now, hours: windowHours } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Server running on port ${PORT}`);
});
