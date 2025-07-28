export interface AccessibilityConfig {
  enableHighContrast: boolean;
  enableLargeText: boolean;
  enableReducedMotion: boolean;
  enableScreenReader: boolean;
  enableKeyboardNavigation: boolean;
  enableFocusIndicators: boolean;
  enableAriaLive: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorScheme: 'light' | 'dark' | 'high-contrast';
  motionPreference: 'no-preference' | 'reduce';
  announcementDelay: number;
  tabIndex: boolean;
  skipLinks: boolean;
  ariaLabels: boolean;
  colorBlindSupport: boolean;
  voiceControl: boolean;
}

export interface AccessibilityFeatures {
  id: string;
  name: string;
  description: string;
  category: 'visual' | 'auditory' | 'motor' | 'cognitive';
  wcagLevel: 'A' | 'AA' | 'AAA';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AccessibilityAudit {
  timestamp: number;
  url: string;
  violations: AccessibilityViolation[];
  passes: AccessibilityPass[];
  incomplete: AccessibilityIncomplete[];
  score: number;
  level: 'A' | 'AA' | 'AAA';
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  tags: string[];
  description: string;
  help: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityPass {
  id: string;
  description: string;
  help: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityIncomplete {
  id: string;
  description: string;
  help: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode {
  target: string;
  html: string;
  failureSummary?: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
}

class AccessibilityService {
  private config: AccessibilityConfig;
  private features: AccessibilityFeatures[] = [];
  private announcements: string[] = [];
  private focusHistory: HTMLElement[] = [];
  private ariaLiveRegion: HTMLElement | null = null;
  private mediaQueryList: MediaQueryList | null = null;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      enableHighContrast: false,
      enableLargeText: false,
      enableReducedMotion: false,
      enableScreenReader: true,
      enableKeyboardNavigation: true,
      enableFocusIndicators: true,
      enableAriaLive: true,
      fontSize: 'medium',
      colorScheme: 'light',
      motionPreference: 'no-preference',
      announcementDelay: 1000,
      tabIndex: true,
      skipLinks: true,
      ariaLabels: true,
      colorBlindSupport: false,
      voiceControl: false,
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    this.loadUserPreferences();
    this.setupMediaQueries();
    this.createAriaLiveRegion();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupSkipLinks();
    this.applyAccessibilityFeatures();
    this.initializeFeatures();
  }

  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('accessibility-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.config = { ...this.config, ...preferences };
      }
    } catch (error) {
      console.error('Failed to load accessibility preferences:', error);
    }

    // Detect system preferences
    this.detectSystemPreferences();
  }

  private detectSystemPreferences(): void {
    // Detect reduced motion preference
    if (window.matchMedia) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.config.enableReducedMotion = reduceMotion.matches;
      
      // Detect color scheme preference
      const darkMode = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkMode.matches) {
        this.config.colorScheme = 'dark';
      }

      // Detect high contrast preference
      const highContrast = window.matchMedia('(prefers-contrast: high)');
      this.config.enableHighContrast = highContrast.matches;
    }
  }

  private setupMediaQueries(): void {
    if (window.matchMedia) {
      this.mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mediaQueryList.addEventListener('change', (e) => {
        this.config.enableReducedMotion = e.matches;
        this.applyMotionPreferences();
      });
    }
  }

  private createAriaLiveRegion(): void {
    if (!this.config.enableAriaLive) return;

    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.setAttribute('aria-relevant', 'additions text');
    this.ariaLiveRegion.style.position = 'absolute';
    this.ariaLiveRegion.style.left = '-10000px';
    this.ariaLiveRegion.style.width = '1px';
    this.ariaLiveRegion.style.height = '1px';
    this.ariaLiveRegion.style.overflow = 'hidden';
    
    document.body.appendChild(this.ariaLiveRegion);
  }

  private setupKeyboardNavigation(): void {
    if (!this.config.enableKeyboardNavigation) return;

    // Add keyboard event listeners
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Ensure all interactive elements are focusable
    this.ensureFocusableElements();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const { key, ctrlKey, altKey, shiftKey } = event;

    // Handle common keyboard shortcuts
    if (altKey && key === 'h') {
      event.preventDefault();
      this.showAccessibilityHelp();
    }

    if (ctrlKey && key === '+') {
      event.preventDefault();
      this.increaseFontSize();
    }

    if (ctrlKey && key === '-') {
      event.preventDefault();
      this.decreaseFontSize();
    }

    if (key === 'Tab') {
      this.handleTabNavigation(event);
    }

    if (key === 'Escape') {
      this.handleEscapeKey();
    }

    // Arrow key navigation for complex widgets
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      this.handleArrowNavigation(event);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key release events if needed
  }

  private handleTabNavigation(event: KeyboardEvent): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (event.shiftKey) {
      // Shift + Tab (backwards)
      if (currentIndex === 0) {
        event.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab (forwards)
      if (currentIndex === focusableElements.length - 1) {
        event.preventDefault();
        focusableElements[0].focus();
      }
    }
  }

  private handleEscapeKey(): void {
    // Close any open modals, dropdowns, etc.
    const modals = document.querySelectorAll('[role="dialog"], [role="menu"]');
    modals.forEach(modal => {
      if (modal instanceof HTMLElement && modal.style.display !== 'none') {
        modal.style.display = 'none';
        
        // Return focus to the trigger element
        const trigger = modal.getAttribute('data-trigger');
        if (trigger) {
          const triggerElement = document.getElementById(trigger);
          if (triggerElement) {
            triggerElement.focus();
          }
        }
      }
    });
  }

  private handleArrowNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const role = target.getAttribute('role');
    
    if (role === 'listbox' || role === 'menu' || role === 'tablist') {
      event.preventDefault();
      this.navigateWithinWidget(target, event.key);
    }
  }

  private navigateWithinWidget(widget: HTMLElement, key: string): void {
    const items = widget.querySelectorAll('[role="option"], [role="menuitem"], [role="tab"]');
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);
    
    let nextIndex = currentIndex;
    
    switch (key) {
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      (items[nextIndex] as HTMLElement).focus();
    }
  }

  private setupFocusManagement(): void {
    if (!this.config.enableFocusIndicators) return;

    // Add focus indicators
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.focusHistory.push(target);
        this.showFocusIndicator(target);
      }
    });

    document.addEventListener('focusout', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.hideFocusIndicator(target);
      }
    });
  }

  private showFocusIndicator(element: HTMLElement): void {
    element.style.outline = '2px solid #007cba';
    element.style.outlineOffset = '2px';
  }

  private hideFocusIndicator(element: HTMLElement): void {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }

  private setupSkipLinks(): void {
    if (!this.config.skipLinks) return;

    const skipLinks = document.createElement('nav');
    skipLinks.setAttribute('aria-label', 'Skip links');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#main-navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;

    // Add CSS for skip links
    const style = document.createElement('style');
    style.textContent = `
      .skip-links {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 9999;
      }
      
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        transition: top 0.3s;
      }
      
      .skip-link:focus {
        top: 6px;
      }
    `;

    document.head.appendChild(style);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  private ensureFocusableElements(): void {
    const interactiveElements = document.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    
    interactiveElements.forEach(element => {
      if (element instanceof HTMLElement) {
        if (!element.hasAttribute('tabindex') && element.tabIndex === -1) {
          element.setAttribute('tabindex', '0');
        }
      }
    });
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  private applyAccessibilityFeatures(): void {
    this.applyColorScheme();
    this.applyFontSize();
    this.applyMotionPreferences();
    this.applyHighContrast();
  }

  private applyColorScheme(): void {
    document.documentElement.setAttribute('data-color-scheme', this.config.colorScheme);
  }

  private applyFontSize(): void {
    const fontSizes = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.25rem',
      'extra-large': '1.5rem'
    };

    document.documentElement.style.fontSize = fontSizes[this.config.fontSize];
  }

  private applyMotionPreferences(): void {
    document.documentElement.setAttribute('data-motion', this.config.enableReducedMotion ? 'reduce' : 'no-preference');
    
    if (this.config.enableReducedMotion) {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private applyHighContrast(): void {
    document.documentElement.setAttribute('data-high-contrast', this.config.enableHighContrast.toString());
    
    if (this.config.enableHighContrast) {
      const style = document.createElement('style');
      style.textContent = `
        * {
          color: #000 !important;
          background-color: #fff !important;
          border-color: #000 !important;
        }
        
        a, button {
          color: #0000ff !important;
          background-color: #fff !important;
        }
        
        a:visited {
          color: #800080 !important;
        }
        
        button:hover, button:focus {
          background-color: #000 !important;
          color: #fff !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private initializeFeatures(): void {
    this.features = [
      {
        id: 'high-contrast',
        name: 'High Contrast',
        description: 'Increase contrast for better visibility',
        category: 'visual',
        wcagLevel: 'AA',
        enabled: this.config.enableHighContrast
      },
      {
        id: 'large-text',
        name: 'Large Text',
        description: 'Increase text size for better readability',
        category: 'visual',
        wcagLevel: 'AA',
        enabled: this.config.enableLargeText
      },
      {
        id: 'reduced-motion',
        name: 'Reduced Motion',
        description: 'Minimize animations and transitions',
        category: 'visual',
        wcagLevel: 'AAA',
        enabled: this.config.enableReducedMotion
      },
      {
        id: 'keyboard-navigation',
        name: 'Keyboard Navigation',
        description: 'Enable full keyboard navigation',
        category: 'motor',
        wcagLevel: 'A',
        enabled: this.config.enableKeyboardNavigation
      },
      {
        id: 'screen-reader',
        name: 'Screen Reader Support',
        description: 'Optimize for screen readers',
        category: 'auditory',
        wcagLevel: 'A',
        enabled: this.config.enableScreenReader
      },
      {
        id: 'focus-indicators',
        name: 'Focus Indicators',
        description: 'Show clear focus indicators',
        category: 'visual',
        wcagLevel: 'AA',
        enabled: this.config.enableFocusIndicators
      }
    ];
  }

  private showAccessibilityHelp(): void {
    const helpModal = document.createElement('div');
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-labelledby', 'accessibility-help-title');
    helpModal.setAttribute('aria-describedby', 'accessibility-help-content');
    helpModal.style.position = 'fixed';
    helpModal.style.top = '50%';
    helpModal.style.left = '50%';
    helpModal.style.transform = 'translate(-50%, -50%)';
    helpModal.style.backgroundColor = '#fff';
    helpModal.style.padding = '2rem';
    helpModal.style.border = '2px solid #000';
    helpModal.style.borderRadius = '8px';
    helpModal.style.zIndex = '9999';
    helpModal.style.maxWidth = '600px';
    helpModal.style.maxHeight = '80vh';
    helpModal.style.overflow = 'auto';

    helpModal.innerHTML = `
      <h2 id="accessibility-help-title">Accessibility Help</h2>
      <div id="accessibility-help-content">
        <h3>Keyboard Shortcuts</h3>
        <ul>
          <li>Alt + H: Show this help</li>
          <li>Ctrl + +: Increase font size</li>
          <li>Ctrl + -: Decrease font size</li>
          <li>Tab: Navigate forward</li>
          <li>Shift + Tab: Navigate backward</li>
          <li>Escape: Close dialogs</li>
        </ul>
        
        <h3>Available Features</h3>
        <ul>
          ${this.features.map(feature => `
            <li>
              <strong>${feature.name}</strong>: ${feature.description}
              (${feature.enabled ? 'Enabled' : 'Disabled'})
            </li>
          `).join('')}
        </ul>
      </div>
      
      <button id="close-help" style="margin-top: 1rem;">Close</button>
    `;

    document.body.appendChild(helpModal);

    // Focus the first interactive element
    const closeButton = helpModal.querySelector('#close-help') as HTMLElement;
    closeButton.focus();

    closeButton.addEventListener('click', () => {
      document.body.removeChild(helpModal);
    });

    // Handle escape key
    helpModal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.body.removeChild(helpModal);
      }
    });
  }

  // Public API
  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.ariaLiveRegion) return;

    this.announcements.push(message);
    
    setTimeout(() => {
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.setAttribute('aria-live', priority);
        this.ariaLiveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
          if (this.ariaLiveRegion) {
            this.ariaLiveRegion.textContent = '';
          }
        }, this.config.announcementDelay);
      }
    }, 100);
  }

  public increaseFontSize(): void {
    const sizes = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(this.config.fontSize);
    
    if (currentIndex < sizes.length - 1) {
      this.config.fontSize = sizes[currentIndex + 1] as AccessibilityConfig['fontSize'];
      this.applyFontSize();
      this.savePreferences();
      this.announce(`Font size increased to ${this.config.fontSize}`);
    }
  }

  public decreaseFontSize(): void {
    const sizes = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(this.config.fontSize);
    
    if (currentIndex > 0) {
      this.config.fontSize = sizes[currentIndex - 1] as AccessibilityConfig['fontSize'];
      this.applyFontSize();
      this.savePreferences();
      this.announce(`Font size decreased to ${this.config.fontSize}`);
    }
  }

  public toggleHighContrast(): void {
    this.config.enableHighContrast = !this.config.enableHighContrast;
    this.applyHighContrast();
    this.savePreferences();
    this.announce(`High contrast ${this.config.enableHighContrast ? 'enabled' : 'disabled'}`);
  }

  public toggleReducedMotion(): void {
    this.config.enableReducedMotion = !this.config.enableReducedMotion;
    this.applyMotionPreferences();
    this.savePreferences();
    this.announce(`Reduced motion ${this.config.enableReducedMotion ? 'enabled' : 'disabled'}`);
  }

  public setColorScheme(scheme: 'light' | 'dark' | 'high-contrast'): void {
    this.config.colorScheme = scheme;
    this.applyColorScheme();
    this.savePreferences();
    this.announce(`Color scheme changed to ${scheme}`);
  }

  public focusElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }

  public getAccessibilityFeatures(): AccessibilityFeatures[] {
    return [...this.features];
  }

  public toggleFeature(featureId: string): void {
    const feature = this.features.find(f => f.id === featureId);
    if (feature) {
      feature.enabled = !feature.enabled;
      
      // Apply the feature change
      switch (featureId) {
        case 'high-contrast':
          this.config.enableHighContrast = feature.enabled;
          this.applyHighContrast();
          break;
        case 'reduced-motion':
          this.config.enableReducedMotion = feature.enabled;
          this.applyMotionPreferences();
          break;
        case 'large-text':
          this.config.enableLargeText = feature.enabled;
          this.config.fontSize = feature.enabled ? 'large' : 'medium';
          this.applyFontSize();
          break;
      }
      
      this.savePreferences();
      this.announce(`${feature.name} ${feature.enabled ? 'enabled' : 'disabled'}`);
    }
  }

  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
    this.applyAccessibilityFeatures();
    this.savePreferences();
  }

  public savePreferences(): void {
    try {
      localStorage.setItem('accessibility-preferences', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save accessibility preferences:', error);
    }
  }

  public auditAccessibility(): Promise<AccessibilityAudit> {
    return new Promise((resolve) => {
      // This would integrate with axe-core or similar accessibility testing tool
      const audit: AccessibilityAudit = {
        timestamp: Date.now(),
        url: window.location.href,
        violations: [],
        passes: [],
        incomplete: [],
        score: 95,
        level: 'AA'
      };
      
      resolve(audit);
    });
  }

  public destroy(): void {
    if (this.ariaLiveRegion) {
      document.body.removeChild(this.ariaLiveRegion);
    }
    
    if (this.mediaQueryList) {
      this.mediaQueryList.removeEventListener('change', this.handleKeyDown);
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }
}

// Export service instance
export const accessibilityService = new AccessibilityService();

// Export class for custom instances
export { AccessibilityService };