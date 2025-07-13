import { Stagehand } from "@browserbasehq/stagehand";
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config();

export interface FacebookSession {
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  userAgent: string;
  timestamp: number;
  isValid: boolean;
}

export interface SessionLoginResult {
  success: boolean;
  session?: FacebookSession;
  error?: string;
}

export class FacebookSessionManager {
  private sessionPath: string;
  private maxSessionAge: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.sessionPath = join(process.cwd(), '.facebook-session.json');
  }

  /**
   * Check if a valid session exists
   */
  hasValidSession(): boolean {
    try {
      if (!existsSync(this.sessionPath)) {
        return false;
      }

      const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
      const session: FacebookSession = sessionData;

      // Check if session is expired
      if (Date.now() - session.timestamp > this.maxSessionAge) {
        console.log('💬 Session expired, will need to re-login');
        return false;
      }

      // Check if session is marked as valid
      if (!session.isValid) {
        console.log('💬 Session marked as invalid, will need to re-login');
        return false;
      }

      console.log('💬 Valid Facebook session found');
      return true;
    } catch (error) {
      console.warn('💬 Error checking session validity:', error);
      return false;
    }
  }

  /**
   * Load saved session data
   */
  loadSession(): FacebookSession | null {
    try {
      if (!existsSync(this.sessionPath)) {
        return null;
      }

      const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf-8'));
      return sessionData as FacebookSession;
    } catch (error) {
      console.error('💬 Error loading session:', error);
      return null;
    }
  }

  /**
   * Save session data to file
   */
  private saveSession(session: FacebookSession): void {
    try {
      writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
      console.log('💬 Facebook session saved successfully');
    } catch (error) {
      console.error('💬 Error saving session:', error);
    }
  }

  /**
   * Clear saved session
   */
  clearSession(): void {
    try {
      if (existsSync(this.sessionPath)) {
        writeFileSync(this.sessionPath, JSON.stringify({ isValid: false }, null, 2));
        console.log('💬 Facebook session cleared');
      }
    } catch (error) {
      console.error('💬 Error clearing session:', error);
    }
  }

  /**
   * Perform login using local browser and save session
   */
  async performLocalLogin(): Promise<SessionLoginResult> {
    console.log('💬 Starting local browser login to Facebook...');
    
    // Validate environment variables
    if (!process.env.FACEBOOK_EMAIL || !process.env.FACEBOOK_PASSWORD) {
      return {
        success: false,
        error: 'Facebook credentials not found in environment variables. Please set FACEBOOK_EMAIL and FACEBOOK_PASSWORD.'
      };
    }

    if (!process.env.GOOGLE_API_KEY) {
      return {
        success: false,
        error: 'Google API key not found. Please set GOOGLE_API_KEY for Stagehand.'
      };
    }

    let stagehand: Stagehand | null = null;
    
    try {
      // Initialize Stagehand with local browser
      console.log("💬 Initializing local Stagehand for Facebook login...");
      stagehand = new Stagehand({
        env: 'LOCAL',
        verbose: 1,
        modelName: 'google/gemini-2.5-flash-preview-05-20',
        modelClientOptions: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
      });
      
      await stagehand.init();
      console.log("💬 Local Stagehand initialized successfully.");
      
      // Get the page instance
      const page = stagehand.page;
      if (!page) {
        throw new Error("Failed to get page instance from Stagehand");
      }
      
      // Navigate to Facebook login page
      console.log("💬 Navigating to Facebook login page...");
      await page.goto('https://www.facebook.com/login');
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Login to Facebook
      console.log("💬 Logging into Facebook...");
      await page.act(`type '${process.env.FACEBOOK_EMAIL}' into the email input`);
      
      await page.act(`type '${process.env.FACEBOOK_PASSWORD}' into the password input`);
      
      await page.act("click the Log In button");
      
      // Wait for login to complete
      console.log("💬 Waiting for login to complete...");
      await page.waitForTimeout(5000);
      
      // Check if login was successful by looking for common Facebook elements
      const currentUrl = page.url();
      if (currentUrl.includes('facebook.com') && !currentUrl.includes('login')) {
        console.log("💬 Login successful! Saving session...");
        
        // Get session data
        const cookies = await page.context().cookies();
        const localStorage = await page.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
              data[key] = window.localStorage.getItem(key) || '';
            }
          }
          return data;
        });
        
        const sessionStorage = await page.evaluate(() => {
          const data: Record<string, string> = {};
          for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key) {
              data[key] = window.sessionStorage.getItem(key) || '';
            }
          }
          return data;
        });
        
        const userAgent = await page.evaluate(() => navigator.userAgent);
        
        const session: FacebookSession = {
          cookies,
          localStorage,
          sessionStorage,
          userAgent,
          timestamp: Date.now(),
          isValid: true
        };
        
        this.saveSession(session);
        
        return {
          success: true,
          session
        };
      } else {
        throw new Error('Login failed - still on login page or redirected to error page');
      }
      
    } catch (error) {
      console.error("💬 Error during local Facebook login:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up
      if (stagehand) {
        console.log("💬 Closing local Stagehand connection.");
        try {
          await stagehand.close();
        } catch (err) {
          console.error("💬 Error closing Stagehand:", err);
        }
      }
    }
  }

  /**
   * Apply saved session to a BrowserBase Stagehand instance
   */
  async applySessionToStagehand(stagehand: Stagehand): Promise<boolean> {
    try {
      const session = this.loadSession();
      if (!session || !session.isValid) {
        console.log('💬 No valid session to apply');
        return false;
      }

      const page = stagehand.page;
      if (!page) {
        throw new Error("Failed to get page instance from Stagehand");
      }

      console.log('💬 Applying saved session to BrowserBase...');
      
      // Set cookies
      await page.context().addCookies(session.cookies);
      
      // Set localStorage and sessionStorage
      await page.evaluate(
        ({ localStorage: localStorageData, sessionStorage: sessionStorageData }) => {
          // Set localStorage
          for (const [key, value] of Object.entries(localStorageData)) {
            try {
              localStorage.setItem(key, value);
            } catch (e) {
              console.warn('Failed to set localStorage item:', key, e);
            }
          }
          
          // Set sessionStorage
          for (const [key, value] of Object.entries(sessionStorageData)) {
            try {
              sessionStorage.setItem(key, value);
            } catch (e) {
              console.warn('Failed to set sessionStorage item:', key, e);
            }
          }
        },
        { localStorage: session.localStorage, sessionStorage: session.sessionStorage }
      );
      
      console.log('💬 Session applied successfully');
      return true;
    } catch (error) {
      console.error('💬 Error applying session:', error);
      return false;
    }
  }

  /**
   * Test if the current session is still valid by checking a Facebook page
   */
  async validateSession(): Promise<boolean> {
    if (!this.hasValidSession()) {
      return false;
    }

    let stagehand: Stagehand | null = null;
    
    try {
      // Initialize Stagehand with BrowserBase
      stagehand = new Stagehand({
        env: 'BROWSERBASE',
        verbose: 1,
        modelName: 'google/gemini-2.5-flash-preview-05-20',
        modelClientOptions: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
      });
      
      await stagehand.init();
      
      // Apply session
      const sessionApplied = await this.applySessionToStagehand(stagehand);
      if (!sessionApplied) {
        return false;
      }
      
      const page = stagehand.page;
      if (!page) {
        return false;
      }
      
      // Navigate to Facebook home page
      await page.goto('https://www.facebook.com');
      await page.waitForTimeout(3000);
      
      // Check if we're logged in (not redirected to login page)
      const currentUrl = page.url();
      const isLoggedIn = currentUrl.includes('facebook.com') && !currentUrl.includes('login');
      
      if (!isLoggedIn) {
        console.log('💬 Session validation failed - not logged in');
        this.clearSession();
        return false;
      }
      
      console.log('💬 Session validation successful');
      return true;
      
    } catch (error) {
      console.error('💬 Error validating session:', error);
      this.clearSession();
      return false;
    } finally {
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (err) {
          console.error("💬 Error closing Stagehand:", err);
        }
      }
    }
  }

  /**
   * Get session info for display
   */
  getSessionInfo(): any {
    const session = this.loadSession();
    if (!session) {
      return { hasSession: false };
    }

    return {
      hasSession: true,
      isValid: session.isValid,
      timestamp: new Date(session.timestamp).toISOString(),
      ageHours: Math.round((Date.now() - session.timestamp) / (1000 * 60 * 60)),
      cookieCount: session.cookies.length,
      localStorageKeys: Object.keys(session.localStorage).length,
      sessionStorageKeys: Object.keys(session.sessionStorage).length
    };
  }
} 