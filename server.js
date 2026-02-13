import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// WORKSPACE ROOT (The entire .openclaw directory)
const ROOT_DIR = path.resolve(__dirname, '../'); 
const WORKSPACE_ROOT = ROOT_DIR;
const AGENTS_ROOT = path.join(ROOT_DIR, 'agents');

console.log('Serving files from:', WORKSPACE_ROOT);
console.log('Agents root:', AGENTS_ROOT);

app.get('/api/files', async (req, res) => {
  try {
    const relativePath = req.query.path || 'workspace'; // Default to workspace folder
    // Prevent directory traversal
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(WORKSPACE_ROOT, safePath);

    // Ensure we stay within ROOT_DIR
    if (!fullPath.startsWith(ROOT_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      const list = files.map(f => ({
        name: f.name,
        isDirectory: f.isDirectory(),
        path: path.join(relativePath, f.name), // path relative to root
        updatedAt: new Date().toISOString()
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

// --- SESSIONS API WITH CACHE ---

const CHANNEL_MAP = {
  // DebateAI
  '1468421608707461325': '#atlas-ceo',
  '1469615895021093029': '#forge-backend',
  '1469615896505880657': '#pixel-frontend',
  '1469615897948979402': '#echo-growth',
  // System
  '1470184543565647894': '#system-engineering',
  '1468748716205932596': '#mission-control',
  // Voice
  '1468534271130992732': '#voice-logs'
};

function formatChannel(id) {
  if (!id) return 'Unknown';
  if (id.startsWith('channel:')) id = id.replace('channel:', '');
  return CHANNEL_MAP[id] || id;
}

// Simple in-memory cache
const sessionCache = {
  data: null,
  timestamp: 0,
  TTL: 10 * 1000 // 10 seconds TTL (reduced for freshness)
};

async function readFirstUserMessage(filePath) {
  try {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity });
    
    for await (const line of rl) {
        try {
            const entry = JSON.parse(line);
            // Look for first user message
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
  } catch (e) {
    return null;
  }
  return null;
}

app.get('/api/sessions', async (req, res) => {
  try {
    const now = Date.now();
    // Use cache if fresh
    if (sessionCache.data && (now - sessionCache.timestamp < sessionCache.TTL)) {
       // Filter and sort the cached data
       const { agentId } = req.query;
       let result = [...sessionCache.data];
       if (agentId) {
         result = result.filter(s => s.agentId === agentId);
       }
       result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
       return res.json(result);
    }

    // Cache expired or missing, fetch fresh
    const agents = await fs.readdir(AGENTS_ROOT);
    const allSessions = [];

    // Parallelize agent scanning
    await Promise.all(agents.map(async (agent) => {
      if (agent.startsWith('.')) return; // Skip hidden/system directories
      
      const sessionsDir = path.join(AGENTS_ROOT, agent, 'sessions');
      const sessionFile = path.join(sessionsDir, 'sessions.json');
      let foundSessions = false;

      // Try sessions.json first
      try {
        const stats = await fs.stat(sessionFile);
        if (stats.isFile()) {
          const data = await fs.readFile(sessionFile, 'utf-8');
          const sessions = JSON.parse(data);
          
          Object.entries(sessions).forEach(([key, s]) => {
            let context = 'unknown';
            let channelName = null;
            
            if (s.deliveryContext) {
                if (s.deliveryContext.channel === 'discord') {
                    const chId = s.deliveryContext.to?.replace('channel:', '');
                    channelName = CHANNEL_MAP[chId];
                    context = channelName || `discord:${chId}`;
                } else {
                    context = `${s.deliveryContext.channel}:${s.deliveryContext.to}`;
                }
            } else if (key.includes('discord')) {
                const parts = key.split(':');
                const chId = parts[parts.length - 1];
                channelName = CHANNEL_MAP[chId];
                context = channelName || `discord:${chId}`;
            }

            allSessions.push({
              ...s,
              key, 
              agentId: agent, 
              status: s.abortedLastRun ? 'aborted' : (s.active ? 'active' : 'completed'),
              displayName: context,
              channelName
            });
          });
          foundSessions = true;
        }
      } catch (e) {}

      // Fallback: Scan files only if sessions.json yielded nothing or errors
      if (!foundSessions || allSessions.filter(s => s.agentId === agent).length === 0) {
        try {
          const files = await fs.readdir(sessionsDir);
          const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
          
          // Limit scanning to most recent 20 files to avoid blocking
          // Sort by mtime first? No, readdir is arbitrary. 
          // We'll stat all of them but only read first line of top 20.
          
          const fileStats = await Promise.all(jsonlFiles.map(async (f) => {
             const fp = path.join(sessionsDir, f);
             const st = await fs.stat(fp);
             return { file: f, mtime: st.mtimeMs, birthtime: st.birthtimeMs, path: fp };
          }));
          
          // Sort by newest
          fileStats.sort((a, b) => b.mtime - a.mtime);
          
          // Take top 50
          const recentFiles = fileStats.slice(0, 50);

          // Parallel read for summaries
          const enrichedSessions = await Promise.all(recentFiles.map(async (fsItem) => {
            const sessionId = fsItem.file.replace('.jsonl', '');
            const summary = await readFirstUserMessage(fsItem.path);
            
            return {
              sessionId,
              key: `agent:${agent}:${sessionId}`, 
              agentId: agent,
              updatedAt: fsItem.mtime,
              status: 'unknown', 
              createdAt: fsItem.birthtime,
              displayName: summary || 'No context',
              kind: 'file-scan',
              summary
            };
          }));
          
          allSessions.push(...enrichedSessions);
        } catch (e) {}
      }
    }));
    
    // Update cache
    sessionCache.data = allSessions;
    sessionCache.timestamp = Date.now();

    // Filter and Response
    const { agentId } = req.query;
    let result = [...allSessions];
    if (agentId) {
      result = result.filter(s => s.agentId === agentId);
    }
    
    result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    res.json(result);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:agentId/:sessionId', async (req, res) => {
  const { agentId, sessionId } = req.params;
  
  // Basic sanitization
  if (!/^[a-zA-Z0-9-_]+$/.test(agentId) || !/^[a-zA-Z0-9-]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  const sessionPath = path.resolve(AGENTS_ROOT, agentId, 'sessions', `${sessionId}.jsonl`);

  // Ensure path is within AGENTS_ROOT to prevent traversal
  if (!sessionPath.startsWith(path.resolve(AGENTS_ROOT))) {
     return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const content = await fs.readFile(sessionPath, 'utf-8');
    // Return as text/plain so frontend can parse JSONL line-by-line
    res.type('text/plain').send(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Try finding the session in sessions.json to get the real path?
      // Or maybe the agent ID is wrong?
      console.error(`Session log not found: ${sessionPath}`);
      return res.status(404).json({ error: 'Session log not found' });
    }
    console.error(`Error reading session log for ${agentId}/${sessionId}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const { exec } = await import('child_process');

// ... (existing code)

app.post('/api/gateway/restart', async (req, res) => {
  try {
    console.log('Restarting gateway...');
    // Execute async but don't wait for it to finish because it might kill the server context? 
    // Actually this server is separate from the gateway process, so it's safe.
    
    exec('openclaw gateway restart', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });
    
    res.json({ success: true, message: 'Gateway restart initiated' });
  } catch (err) {
    console.error('Error restarting gateway:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
