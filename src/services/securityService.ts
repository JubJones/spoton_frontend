import { errorHandler } from './errorHandler';

export interface SecurityConfig {
  enableCSP: boolean;
  enableXSS: boolean;
  enableCSRF: boolean;
  enableInputValidation: boolean;
  enableOutputSanitization: boolean;
  enableRateLimit: boolean;
  enableSecurityHeaders: boolean;
  enableAuditLogging: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  requireStrongPassword: boolean;
  enableTwoFactor: boolean;
  csrfTokenHeader: string;
  rateLimitWindow: number;
  rateLimitRequests: number;
  trustedOrigins: string[];
  allowedFileTypes: string[];
  maxFileSize: number;
  maxRequestSize: number;
}

export interface SecurityViolation {
  id: string;
  type: 'xss' | 'csrf' | 'injection' | 'ratelimit' | 'authentication' | 'authorization' | 'input_validation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  payload?: any;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
  blocked: boolean;
  sessionId?: string;
  userId?: string;
}

export interface SecurityAuditLog {
  id: string;
  event: 'login' | 'logout' | 'access_denied' | 'permission_change' | 'data_access' | 'data_modification' | 'security_violation';
  userId?: string;
  sessionId?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure' | 'blocked';
  details?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidationRule {
  name: string;
  pattern?: RegExp;
  validator?: (value: any) => boolean;
  sanitizer?: (value: any) => any;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  allowedValues?: any[];
  customMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedValue?: any;
  warnings?: string[];
}

class SecurityService {
  private config: SecurityConfig;
  private violations: SecurityViolation[] = [];
  private auditLog: SecurityAuditLog[] = [];
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();
  private activeSessions = new Map<string, { userId: string; lastActivity: number; created: number }>();
  private csrfTokens = new Map<string, { token: string; expires: number }>();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableXSS: true,
      enableCSRF: true,
      enableInputValidation: true,
      enableOutputSanitization: true,
      enableRateLimit: true,
      enableSecurityHeaders: true,
      enableAuditLogging: true,
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
      sessionTimeout: 3600000, // 1 hour
      passwordMinLength: 12,
      requireStrongPassword: true,
      enableTwoFactor: false,
      csrfTokenHeader: 'X-CSRF-Token',
      rateLimitWindow: 60000, // 1 minute
      rateLimitRequests: 100,
      trustedOrigins: ['https://localhost:3000', 'https://spoton.company.com'],
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxRequestSize: 50 * 1024 * 1024, // 50MB
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    if (this.config.enableCSP) {
      this.setupContentSecurityPolicy();
    }

    if (this.config.enableSecurityHeaders) {
      this.setupSecurityHeaders();
    }

    if (this.config.enableXSS) {
      this.setupXSSProtection();
    }

    this.startSecurityMonitoring();
  }

  private setupContentSecurityPolicy(): void {
    const cspDirectives = {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self' data:",
      'connect-src': "'self' ws: wss:",
      'media-src': "'self'",
      'object-src': "'none'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'frame-ancestors': "'none'",
      'upgrade-insecure-requests': ''
    };

    const cspHeader = Object.entries(cspDirectives)
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; ');

    // Note: In a real app, this would be set by the server
    // This is for demonstration purposes
    document.head.insertAdjacentHTML('beforeend', 
      `<meta http-equiv="Content-Security-Policy" content="${cspHeader}">`
    );
  }

  private setupSecurityHeaders(): void {
    // These headers would typically be set by the server
    // This is for demonstration and client-side enforcement
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    Object.entries(headers).forEach(([name, value]) => {
      document.head.insertAdjacentHTML('beforeend', 
        `<meta http-equiv="${name}" content="${value}">`
      );
    });
  }

  private setupXSSProtection(): void {
    // Override innerHTML to add XSS protection
    const originalInnerHTML = Element.prototype.innerHTML;
    
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        const sanitized = this.sanitizeHTML(value);
        originalInnerHTML.call(this, sanitized);
      }.bind(this),
      get: function() {
        return originalInnerHTML.call(this);
      }
    });
  }

  private startSecurityMonitoring(): void {
    // Monitor for suspicious activities
    setInterval(() => {
      this.checkSuspiciousActivity();
      this.cleanupExpiredSessions();
      this.cleanupRateLimits();
    }, 60000); // Every minute

    // Monitor DOM modifications
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                this.scanForThreats(node as Element);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  private checkSuspiciousActivity(): void {
    // Check for rapid successive API calls
    const now = Date.now();
    const recentViolations = this.violations.filter(v => 
      now - new Date(v.timestamp).getTime() < 300000 // Last 5 minutes
    );

    if (recentViolations.length > 10) {
      this.recordViolation({
        type: 'suspicious_activity',
        severity: 'high',
        description: 'High number of security violations detected',
        source: 'security_monitor'
      });
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    
    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.config.sessionTimeout) {
        this.activeSessions.delete(sessionId);
        this.auditLog.push({
          id: this.generateId(),
          event: 'logout',
          sessionId,
          userId: session.userId,
          result: 'success',
          details: { reason: 'session_timeout' },
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    
    this.rateLimitMap.forEach((limit, key) => {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(key);
      }
    });
  }

  private scanForThreats(element: Element): void {
    // Scan for XSS attempts
    const scripts = element.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src || script.innerHTML) {
        this.recordViolation({
          type: 'xss',
          severity: 'high',
          description: 'Potential XSS attempt detected',
          source: 'dom_scanner',
          payload: { src: script.src, content: script.innerHTML }
        });
      }
    });

    // Scan for suspicious attributes
    const suspiciousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover'];
    const elementsWithEvents = element.querySelectorAll('*');
    
    elementsWithEvents.forEach(el => {
      suspiciousAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
          this.recordViolation({
            type: 'xss',
            severity: 'medium',
            description: `Suspicious ${attr} attribute detected`,
            source: 'dom_scanner',
            payload: { attribute: attr, value: el.getAttribute(attr) }
          });
        }
      });
    });
  }

  private recordViolation(violation: Omit<SecurityViolation, 'id' | 'timestamp' | 'blocked' | 'userAgent' | 'ipAddress'>): void {
    const fullViolation: SecurityViolation = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      blocked: true,
      userAgent: navigator.userAgent,
      ipAddress: 'client-side', // Would be populated by server
      ...violation
    };

    this.violations.push(fullViolation);

    // Report to error handler
    errorHandler.handleError({
      type: 'validation_error',
      severity: violation.severity === 'critical' ? 'critical' : 'high',
      message: `Security violation: ${violation.description}`,
      component: 'security_service',
      context: {
        violationType: violation.type,
        source: violation.source,
        payload: violation.payload
      }
    });

    // Keep only recent violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-500);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Input validation and sanitization
  public validateInput(value: any, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitizedValue = value;

    for (const rule of rules) {
      // Check required
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push(rule.customMessage || `${rule.name} is required`);
        continue;
      }

      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Apply sanitizer
      if (rule.sanitizer) {
        sanitizedValue = rule.sanitizer(sanitizedValue);
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(String(sanitizedValue))) {
        errors.push(rule.customMessage || `${rule.name} format is invalid`);
      }

      // Check custom validator
      if (rule.validator && !rule.validator(sanitizedValue)) {
        errors.push(rule.customMessage || `${rule.name} validation failed`);
      }

      // Check length constraints
      if (rule.minLength && String(sanitizedValue).length < rule.minLength) {
        errors.push(`${rule.name} must be at least ${rule.minLength} characters`);
      }

      if (rule.maxLength && String(sanitizedValue).length > rule.maxLength) {
        errors.push(`${rule.name} must not exceed ${rule.maxLength} characters`);
      }

      // Check numeric constraints
      if (rule.min !== undefined && Number(sanitizedValue) < rule.min) {
        errors.push(`${rule.name} must be at least ${rule.min}`);
      }

      if (rule.max !== undefined && Number(sanitizedValue) > rule.max) {
        errors.push(`${rule.name} must not exceed ${rule.max}`);
      }

      // Check allowed values
      if (rule.allowedValues && !rule.allowedValues.includes(sanitizedValue)) {
        errors.push(`${rule.name} must be one of: ${rule.allowedValues.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedValue,
      warnings
    };
  }

  public sanitizeHTML(html: string): string {
    if (!this.config.enableOutputSanitization) {
      return html;
    }

    // Basic HTML sanitization
    const div = document.createElement('div');
    div.textContent = html;
    let sanitized = div.innerHTML;

    // Remove dangerous elements
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'];
    dangerousElements.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove dangerous attributes
    const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'];
    dangerousAttributes.forEach(attr => {
      const regex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]+`, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
  }

  public sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Check against trusted origins
      if (this.config.trustedOrigins.length > 0) {
        const trusted = this.config.trustedOrigins.some(origin => 
          urlObj.origin === origin || urlObj.origin.endsWith(origin)
        );
        
        if (!trusted) {
          this.recordViolation({
            type: 'suspicious_activity',
            severity: 'medium',
            description: 'Untrusted URL detected',
            source: 'url_sanitizer',
            payload: { url }
          });
          return '';
        }
      }

      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      if (dangerousProtocols.some(protocol => urlObj.protocol === protocol)) {
        this.recordViolation({
          type: 'xss',
          severity: 'high',
          description: 'Dangerous protocol in URL',
          source: 'url_sanitizer',
          payload: { url, protocol: urlObj.protocol }
        });
        return '';
      }

      return urlObj.toString();
    } catch (error) {
      this.recordViolation({
        type: 'input_validation',
        severity: 'low',
        description: 'Invalid URL format',
        source: 'url_sanitizer',
        payload: { url }
      });
      return '';
    }
  }

  // Rate limiting
  public checkRateLimit(identifier: string, requests: number = 1): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }

    const now = Date.now();
    const limit = this.rateLimitMap.get(identifier);

    if (!limit || now > limit.resetTime) {
      this.rateLimitMap.set(identifier, {
        count: requests,
        resetTime: now + this.config.rateLimitWindow
      });
      return true;
    }

    if (limit.count + requests <= this.config.rateLimitRequests) {
      limit.count += requests;
      return true;
    }

    this.recordViolation({
      type: 'ratelimit',
      severity: 'medium',
      description: 'Rate limit exceeded',
      source: 'rate_limiter',
      payload: { identifier, count: limit.count, limit: this.config.rateLimitRequests }
    });

    return false;
  }

  // Authentication security
  public checkLoginAttempts(identifier: string): boolean {
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      return true;
    }

    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      this.recordViolation({
        type: 'authentication',
        severity: 'medium',
        description: 'Login attempted on locked account',
        source: 'auth_service',
        payload: { identifier, lockedUntil: attempts.lockedUntil }
      });
      return false;
    }

    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      this.loginAttempts.delete(identifier);
      return true;
    }

    return attempts.count < this.config.maxLoginAttempts;
  }

  public recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      this.loginAttempts.delete(identifier);
      this.auditLog.push({
        id: this.generateId(),
        event: 'login',
        userId: identifier,
        result: 'success',
        timestamp: new Date().toISOString()
      });
    } else {
      const attempts = this.loginAttempts.get(identifier) || { count: 0 };
      attempts.count++;

      if (attempts.count >= this.config.maxLoginAttempts) {
        attempts.lockedUntil = Date.now() + this.config.lockoutDuration;
        
        this.recordViolation({
          type: 'authentication',
          severity: 'high',
          description: 'Account locked due to failed login attempts',
          source: 'auth_service',
          payload: { identifier, attempts: attempts.count }
        });
      }

      this.loginAttempts.set(identifier, attempts);
      
      this.auditLog.push({
        id: this.generateId(),
        event: 'login',
        userId: identifier,
        result: 'failure',
        details: { attempt: attempts.count },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Session management
  public createSession(userId: string): string {
    const sessionId = this.generateId();
    const now = Date.now();
    
    this.activeSessions.set(sessionId, {
      userId,
      lastActivity: now,
      created: now
    });

    this.auditLog.push({
      id: this.generateId(),
      event: 'login',
      userId,
      sessionId,
      result: 'success',
      timestamp: new Date().toISOString()
    });

    return sessionId;
  }

  public validateSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    const now = Date.now();
    
    if (now - session.lastActivity > this.config.sessionTimeout) {
      this.activeSessions.delete(sessionId);
      return false;
    }

    session.lastActivity = now;
    return true;
  }

  public destroySession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      this.activeSessions.delete(sessionId);
      
      this.auditLog.push({
        id: this.generateId(),
        event: 'logout',
        userId: session.userId,
        sessionId,
        result: 'success',
        timestamp: new Date().toISOString()
      });
    }
  }

  // CSRF Protection
  public generateCSRFToken(sessionId: string): string {
    const token = this.generateId();
    const expires = Date.now() + 3600000; // 1 hour
    
    this.csrfTokens.set(sessionId, { token, expires });
    
    return token;
  }

  public validateCSRFToken(sessionId: string, token: string): boolean {
    if (!this.config.enableCSRF) {
      return true;
    }

    const stored = this.csrfTokens.get(sessionId);
    
    if (!stored || stored.expires < Date.now()) {
      this.recordViolation({
        type: 'csrf',
        severity: 'high',
        description: 'Invalid or expired CSRF token',
        source: 'csrf_validator',
        payload: { sessionId, token }
      });
      return false;
    }

    if (stored.token !== token) {
      this.recordViolation({
        type: 'csrf',
        severity: 'high',
        description: 'CSRF token mismatch',
        source: 'csrf_validator',
        payload: { sessionId, expected: stored.token, received: token }
      });
      return false;
    }

    return true;
  }

  // File upload security
  public validateFileUpload(file: File): ValidationResult {
    const errors: string[] = [];
    
    // Check file type
    if (!this.config.allowedFileTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size ${file.size} exceeds maximum allowed size ${this.config.maxFileSize}`);
    }

    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = this.config.allowedFileTypes.map(type => 
      type.split('/')[1]
    );
    
    if (extension && !allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} is not allowed`);
    }

    if (errors.length > 0) {
      this.recordViolation({
        type: 'input_validation',
        severity: 'medium',
        description: 'File upload validation failed',
        source: 'file_validator',
        payload: { fileName: file.name, fileType: file.type, fileSize: file.size, errors }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Public API
  public getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  public getAuditLog(): SecurityAuditLog[] {
    return [...this.auditLog];
  }

  public getSecurityStats(): {
    totalViolations: number;
    violationsByType: Record<string, number>;
    violationsBySeverity: Record<string, number>;
    recentViolations: number;
    activeSessions: number;
    lockedAccounts: number;
  } {
    const now = Date.now();
    const recentViolations = this.violations.filter(v => 
      now - new Date(v.timestamp).getTime() < 3600000 // Last hour
    );

    const violationsByType: Record<string, number> = {};
    const violationsBySeverity: Record<string, number> = {};

    this.violations.forEach(violation => {
      violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1;
    });

    const lockedAccounts = Array.from(this.loginAttempts.values())
      .filter(attempts => attempts.lockedUntil && attempts.lockedUntil > now)
      .length;

    return {
      totalViolations: this.violations.length,
      violationsByType,
      violationsBySeverity,
      recentViolations: recentViolations.length,
      activeSessions: this.activeSessions.size,
      lockedAccounts
    };
  }

  public getSecurityHealth(): {
    overall: 'secure' | 'at_risk' | 'compromised';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const stats = this.getSecurityStats();

    if (stats.recentViolations > 50) {
      issues.push('High number of recent security violations');
      recommendations.push('Review and strengthen input validation');
    }

    if (stats.lockedAccounts > 10) {
      issues.push('High number of locked accounts');
      recommendations.push('Implement additional authentication security measures');
    }

    if (stats.violationsByType.xss > 5) {
      issues.push('Multiple XSS attempts detected');
      recommendations.push('Enhance XSS protection and output sanitization');
    }

    if (stats.violationsByType.csrf > 3) {
      issues.push('CSRF attacks detected');
      recommendations.push('Verify CSRF token implementation');
    }

    let overall: 'secure' | 'at_risk' | 'compromised';
    if (issues.length === 0) overall = 'secure';
    else if (issues.length <= 2) overall = 'at_risk';
    else overall = 'compromised';

    return { overall, issues, recommendations };
  }

  public updateConfig(config: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  public clearViolations(): void {
    this.violations = [];
  }

  public clearAuditLog(): void {
    this.auditLog = [];
  }

  public destroy(): void {
    this.activeSessions.clear();
    this.violations = [];
    this.auditLog = [];
    this.rateLimitMap.clear();
    this.loginAttempts.clear();
    this.csrfTokens.clear();
  }
}

// Export service instance
export const securityService = new SecurityService();

// Export class for custom instances
export { SecurityService };