import { MCPBaseAgent, MCPTool, MCPToolResult } from './mcp-base-agent';
import { Stagehand, type ConstructorParams } from "@browserbasehq/stagehand";
import { FacebookSessionManager } from './facebook-session-manager';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

export interface MessageDraft {
  listingId: string;
  listingTitle: string;
  listingUrl: string;
  message: string;
  recipientType: 'seller' | 'landlord';
}

export interface MessageSendResult {
  success: boolean;
  listingId: string;
  message: string;
  error?: string;
  timestamp?: Date;
}

export class MessengerAgentMCP extends MCPBaseAgent {
  private housingData: any[] = [];
  private sessionManager: FacebookSessionManager;

  constructor() {
    super('MessengerAgentMCP', 'gpt-4o-mini');
    this.sessionManager = new FacebookSessionManager();
  }

  async initialize(): Promise<void> {
    console.log('💬 Initializing Messenger Agent MCP...');
    await this.loadHousingData();
    this.registerMCPToolHandlers();
    console.log('💬 Messenger Agent MCP initialized');
  }

  private async loadHousingData(): Promise<void> {
    try {
      // Load both Craigslist and Facebook data
      const craigslistPath = join(process.cwd(), 'CraigslistData', 'clean-listings.json');
      const facebookPath = join(process.cwd(), 'FacebookData', 'clean-listings.json');
      
      let craigslistData = [];
      let facebookData = [];
      
      try {
        const craigslistRaw = readFileSync(craigslistPath, 'utf-8');
        craigslistData = JSON.parse(craigslistRaw).map((item: any) => ({
          ...item,
          source: 'craigslist'
        }));
      } catch (error) {
        console.warn('⚠️ Could not load Craigslist data:', error);
      }
      
      try {
        const facebookRaw = readFileSync(facebookPath, 'utf-8');
        facebookData = JSON.parse(facebookRaw).map((item: any) => ({
          ...item,
          source: 'facebook'
        }));
      } catch (error) {
        console.warn('⚠️ Could not load Facebook data:', error);
      }
      
      this.housingData = [...craigslistData, ...facebookData];
      console.log(`💬 Loaded ${this.housingData.length} total listings (${craigslistData.length} Craigslist, ${facebookData.length} Facebook)`);
      
    } catch (error) {
      console.error('❌ Error loading housing data:', error);
      throw error;
    }
  }

  getMCPTools(): MCPTool[] {
    return [
      {
        name: 'draft_message',
        description: 'Draft a message for a specific housing listing',
        inputSchema: {
          type: 'object',
          properties: {
            listingId: {
              type: 'string',
              description: 'The ID of the listing to message about'
            },
            userMessage: {
              type: 'string',
              description: 'Optional custom message from the user. If not provided, will generate a professional inquiry message.'
            },
            includeQuestions: {
              type: 'boolean',
              description: 'Whether to include relevant questions about the listing (default: true)'
            }
          },
          required: ['listingId']
        }
      },
      {
        name: 'send_facebook_message',
        description: 'Send a message to a Facebook Marketplace listing',
        inputSchema: {
          type: 'object',
          properties: {
            listingId: {
              type: 'string',
              description: 'The ID of the Facebook listing to message'
            },
            message: {
              type: 'string',
              description: 'The message to send'
            }
          },
          required: ['listingId', 'message']
        }
      },
      {
        name: 'get_listing_details',
        description: 'Get details for a specific listing by ID',
        inputSchema: {
          type: 'object',
          properties: {
            listingId: {
              type: 'string',
              description: 'The ID of the listing to get details for'
            }
          },
          required: ['listingId']
        }
      },
      {
        name: 'facebook_login',
        description: 'Perform Facebook login using local browser and save session',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'check_facebook_session',
        description: 'Check if a valid Facebook session exists',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'clear_facebook_session',
        description: 'Clear the saved Facebook session',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  registerMCPToolHandlers(): void {
    this.registerMCPTool('draft_message', this.handleDraftMessage.bind(this));
    this.registerMCPTool('send_facebook_message', this.handleSendFacebookMessage.bind(this));
    this.registerMCPTool('get_listing_details', this.handleGetListingDetails.bind(this));
    this.registerMCPTool('facebook_login', this.handleFacebookLogin.bind(this));
    this.registerMCPTool('check_facebook_session', this.handleCheckFacebookSession.bind(this));
    this.registerMCPTool('clear_facebook_session', this.handleClearFacebookSession.bind(this));
  }

  private async handleDraftMessage(args: any): Promise<MCPToolResult> {
    try {
      const { listingId, userMessage, includeQuestions = true } = args;
      
      // Find the listing
      const listing = this.housingData.find(l => l.id === listingId);
      if (!listing) {
        return this.createMCPError(`Listing with ID ${listingId} not found`);
      }

      // Draft the message
      const draft = await this.draftMessage(listing, userMessage, includeQuestions);
      
      return this.createMCPJSONResult({
        listingId,
        listingTitle: listing.title,
        listingUrl: listing.url,
        listingSource: listing.source,
        draftedMessage: draft.message,
        messageType: draft.recipientType,
        canSend: listing.source === 'facebook' // Only Facebook messages can be sent automatically
      });
      
    } catch (error) {
      return this.createMCPError(`Error drafting message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleSendFacebookMessage(args: any): Promise<MCPToolResult> {
    try {
      const { listingId, message } = args;
      
      // Find the listing
      const listing = this.housingData.find(l => l.id === listingId);
      if (!listing) {
        return this.createMCPError(`Listing with ID ${listingId} not found`);
      }

      if (listing.source !== 'facebook') {
        return this.createMCPError(`Can only send messages to Facebook listings. This listing is from ${listing.source}`);
      }

      // Send the message
      const result = await this.sendFacebookMessage(listing, message);
      
      return this.createMCPJSONResult({
        success: result.success,
        listingId,
        listingTitle: listing.title,
        message: result.message,
        error: result.error,
        timestamp: result.timestamp
      });
      
    } catch (error) {
      return this.createMCPError(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleGetListingDetails(args: any): Promise<MCPToolResult> {
    try {
      const { listingId } = args;
      
      // Find the listing
      const listing = this.housingData.find(l => l.id === listingId);
      if (!listing) {
        return this.createMCPError(`Listing with ID ${listingId} not found`);
      }

      return this.createMCPJSONResult({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        location: listing.location,
        description: listing.description,
        url: listing.url,
        source: listing.source,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        privateRoom: listing.privateRoom,
        privateBath: listing.privateBath,
        housingType: listing.housingType,
        coordinates: listing.coordinates,
        postedDate: listing.postedDate
      });
      
    } catch (error) {
      return this.createMCPError(`Error getting listing details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleFacebookLogin(args: any): Promise<MCPToolResult> {
    try {
      console.log('💬 Starting Facebook login process...');
      const result = await this.sessionManager.performLocalLogin();
      
      if (result.success) {
        return this.createMCPJSONResult({
          success: true,
          message: 'Facebook login successful! Session saved.',
          sessionInfo: this.sessionManager.getSessionInfo()
        });
      } else {
        return this.createMCPError(`Facebook login failed: ${result.error}`);
      }
    } catch (error) {
      return this.createMCPError(`Error during Facebook login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleCheckFacebookSession(args: any): Promise<MCPToolResult> {
    try {
      const hasValidSession = this.sessionManager.hasValidSession();
      const sessionInfo = this.sessionManager.getSessionInfo();
      
      return this.createMCPJSONResult({
        hasValidSession,
        sessionInfo,
        message: hasValidSession ? 'Valid Facebook session found' : 'No valid Facebook session - login required'
      });
    } catch (error) {
      return this.createMCPError(`Error checking Facebook session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleClearFacebookSession(args: any): Promise<MCPToolResult> {
    try {
      this.sessionManager.clearSession();
      return this.createMCPJSONResult({
        success: true,
        message: 'Facebook session cleared successfully'
      });
    } catch (error) {
      return this.createMCPError(`Error clearing Facebook session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async draftMessage(listing: any, userMessage?: string, includeQuestions: boolean = true): Promise<MessageDraft> {
    const recipientType = listing.source === 'facebook' ? 'seller' : 'landlord';
    
    let message = '';
    
    if (userMessage) {
      // Use the user's custom message as base
      message = userMessage;
    } else {
      // Generate a professional inquiry message
      message = `Hi! I'm interested in your ${listing.housingType} listing "${listing.title}" for $${listing.price}`;
      
      if (listing.location) {
        message += ` in ${listing.location}`;
      }
      
      message += '.';
      
      if (includeQuestions) {
        // Add relevant questions based on the listing
        const questions = [];
        
        if (!listing.availableDate || listing.availableDate === '') {
          questions.push('When would this be available?');
        }
        
        if (listing.privateRoom && !listing.privateBath) {
          questions.push('How many people would be sharing the bathroom?');
        }
        
        if (!listing.description.toLowerCase().includes('lease') && !listing.description.toLowerCase().includes('term')) {
          questions.push('What is the lease term?');
        }
        
        if (!listing.description.toLowerCase().includes('deposit')) {
          questions.push('What is the security deposit?');
        }
        
        if (listing.source === 'facebook') {
          questions.push('Would it be possible to schedule a viewing?');
        }
        
        if (questions.length > 0) {
          message += '\n\nI have a few questions:\n';
          questions.forEach((q, i) => {
            message += `${i + 1}. ${q}\n`;
          });
        }
      }
      
      message += '\nThank you for your time!';
    }
    
    return {
      listingId: listing.id,
      listingTitle: listing.title,
      listingUrl: listing.url,
      message,
      recipientType
    };
  }

  private async sendFacebookMessage(listing: any, message: string): Promise<MessageSendResult> {
    const listingUrl = listing.url;
    
    // Validate environment variables
    if (!process.env.GOOGLE_API_KEY) {
      return {
        success: false,
        listingId: listing.id,
        message,
        error: 'Google API key not found. Please set GOOGLE_API_KEY for Stagehand.'
      };
    }

    // Check if we have a valid session
    if (!this.sessionManager.hasValidSession()) {
      return {
        success: false,
        listingId: listing.id,
        message,
        error: 'No valid Facebook session found. Please run facebook_login first to login using local browser.'
      };
    }

    let stagehand: Stagehand | null = null;
    
    try {
      // Initialize Stagehand with BrowserBase
      console.log("💬 Initializing BrowserBase Stagehand for Facebook messaging...");
      stagehand = new Stagehand({
        env: 'BROWSERBASE',
        verbose: 1,
        modelName: 'google/gemini-2.5-flash-preview-05-20',
        modelClientOptions: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
      });
      
      await stagehand.init();
      console.log("💬 BrowserBase Stagehand initialized successfully.");
      
      // Get the page instance
      const page = stagehand.page;
      if (!page) {
        throw new Error("Failed to get page instance from Stagehand");
      }
      
      // Apply saved session
      console.log("💬 Applying saved Facebook session...");
      const sessionApplied = await this.sessionManager.applySessionToStagehand(stagehand);
      if (!sessionApplied) {
        throw new Error("Failed to apply Facebook session. Please login again.");
      }
      
      // Navigate to the listing
      console.log(`💬 Navigating to: ${listingUrl}`);
      await page.goto(listingUrl);
      
      // Wait for page to load
      await page.waitForTimeout(3000);
      
      // Check if we're still logged in (not redirected to login page)
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        console.log("💬 Session expired, clearing and requiring re-login");
        this.sessionManager.clearSession();
        throw new Error("Facebook session expired. Please run facebook_login again.");
      }
      
      // Send the message
      console.log("💬 Sending message...");
      await page.act(`type "${message}" into the message text area`);
      
      await page.act("click the Send button");
      
      // Wait a moment for message to send
      await page.waitForTimeout(2000);
      
      console.log("💬 Message sent successfully!");
      
      return {
        success: true,
        listingId: listing.id,
        message,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error("💬 Error sending Facebook message:", error);
      return {
        success: false,
        listingId: listing.id,
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up
      if (stagehand) {
        console.log("💬 Closing Stagehand connection.");
        try {
          await stagehand.close();
        } catch (err) {
          console.error("💬 Error closing Stagehand:", err);
        }
      }
    }
  }

  getCapabilities(): any[] {
    return [
      {
        name: 'draft_message',
        description: 'Draft professional messages for housing listings',
        parameters: {
          listingId: 'string',
          userMessage: 'string (optional)',
          includeQuestions: 'boolean (optional)'
        }
      },
      {
        name: 'send_facebook_message',
        description: 'Send messages to Facebook Marketplace listings',
        parameters: {
          listingId: 'string',
          message: 'string'
        }
      },
      {
        name: 'get_listing_details',
        description: 'Get detailed information about a specific listing',
        parameters: {
          listingId: 'string'
        }
      },
      {
        name: 'facebook_login',
        description: 'Perform Facebook login using local browser and save session',
        parameters: {}
      },
      {
        name: 'check_facebook_session',
        description: 'Check if a valid Facebook session exists',
        parameters: {}
      },
      {
        name: 'clear_facebook_session',
        description: 'Clear the saved Facebook session',
        parameters: {}
      }
    ];
  }
} 