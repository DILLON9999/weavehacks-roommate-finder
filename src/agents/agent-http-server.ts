import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { MCPMultiAgentHousingSystem } from './multi-agent-system-mcp';

config();

const app = express();
const PORT = process.env.AGENT_HTTP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Global system instance
let systemInstance: MCPMultiAgentHousingSystem | null = null;
let isInitializing = false;

// Initialize system once
async function getSystemInstance(): Promise<MCPMultiAgentHousingSystem> {
  if (systemInstance) {
    return systemInstance;
  }
  
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return systemInstance!;
  }
  
  isInitializing = true;
  console.log('🚀 Initializing MCP Multi-Agent System for HTTP server...');
  
  try {
    systemInstance = new MCPMultiAgentHousingSystem();
    await systemInstance.initialize();
    console.log('✅ MCP Multi-Agent System initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize MCP Multi-Agent System:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
  
  return systemInstance;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    initialized: !!systemInstance 
  });
});

// Query endpoint
app.post('/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }
    
    console.log('🔍 Processing HTTP query:', query);
    
    // Get system instance (will initialize if needed)
    const system = await getSystemInstance();
    
    // Process the query
    const results = await system.processQuery(query);
    
    console.log('✅ Query completed, returning', results.length, 'results');
    
    // Return clean JSON response
    res.json({
      success: true,
      results: results,
      query: query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Query processing failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get('/status', async (req: Request, res: Response) => {
  try {
    if (!systemInstance) {
      return res.json({
        initialized: false,
        status: 'not_initialized'
      });
    }
    
    const status = await systemInstance.getSystemStatus();
    res.json({
      initialized: true,
      status: 'ready',
      systemStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
async function startServer() {
  console.log('🎭 Starting Agent HTTP Server...');
  
  app.listen(PORT, () => {
    console.log(`🌐 Agent HTTP Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔍 Query endpoint: POST http://localhost:${PORT}/query`);
    console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Agent HTTP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Agent HTTP Server...');
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export { app, startServer }; 