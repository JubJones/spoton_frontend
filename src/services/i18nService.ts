export interface I18nConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  rtlLanguages: string[];
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyFormat: string;
  enablePluralisation: boolean;
  enableInterpolation: boolean;
  enableNamespaces: boolean;
  loadOnDemand: boolean;
  cacheTranslations: boolean;
  autoDetectLanguage: boolean;
  persistLanguagePreference: boolean;
}

export interface TranslationResource {
  [key: string]: string | TranslationResource;
}

export interface TranslationNamespace {
  [language: string]: TranslationResource;
}

export interface PluralRule {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface I18nContext {
  language: string;
  direction: 'ltr' | 'rtl';
  region: string;
  timezone: string;
  currency: string;
  numberFormat: Intl.NumberFormat;
  dateFormat: Intl.DateTimeFormat;
  timeFormat: Intl.DateTimeFormat;
  collator: Intl.Collator;
}

export interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
  namespace?: string;
  returnObjects?: boolean;
  lng?: string;
}

class I18nService {
  private config: I18nConfig;
  private translations: Map<string, TranslationNamespace> = new Map();
  private currentLanguage: string;
  private currentContext: I18nContext;
  private observers: ((context: I18nContext) => void)[] = [];
  private loadedNamespaces: Set<string> = new Set();
  private pluralRules: Map<string, Intl.PluralRules> = new Map();

  constructor(config: Partial<I18nConfig> = {}) {
    this.config = {
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar', 'ru', 'pt', 'it'],
      rtlLanguages: ['ar', 'he', 'fa', 'ur'],
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      numberFormat: 'en-US',
      currencyFormat: 'USD',
      enablePluralisation: true,
      enableInterpolation: true,
      enableNamespaces: true,
      loadOnDemand: true,
      cacheTranslations: true,
      autoDetectLanguage: true,
      persistLanguagePreference: true,
      ...config
    };

    this.currentLanguage = this.config.defaultLanguage;
    this.currentContext = this.createContext(this.currentLanguage);
    this.initialize();
  }

  private initialize(): void {
    this.loadStoredLanguage();
    this.detectBrowserLanguage();
    this.setupPluralRules();
    this.loadDefaultTranslations();
    this.updateDocumentLanguage();
    this.setupLanguageObserver();
  }

  private loadStoredLanguage(): void {
    if (!this.config.persistLanguagePreference) return;

    try {
      const stored = localStorage.getItem('i18n-language');
      if (stored && this.config.supportedLanguages.includes(stored)) {
        this.currentLanguage = stored;
      }
    } catch (error) {
      console.error('Failed to load stored language:', error);
    }
  }

  private detectBrowserLanguage(): void {
    if (!this.config.autoDetectLanguage) return;

    const browserLanguage = navigator.language || navigator.languages?.[0];
    if (browserLanguage) {
      const langCode = browserLanguage.split('-')[0];
      if (this.config.supportedLanguages.includes(langCode)) {
        this.currentLanguage = langCode;
      }
    }
  }

  private setupPluralRules(): void {
    if (!this.config.enablePluralisation) return;

    this.config.supportedLanguages.forEach(lang => {
      this.pluralRules.set(lang, new Intl.PluralRules(lang));
    });
  }

  private loadDefaultTranslations(): void {
    // Load default translations for core functionality
    const defaultTranslations = {
      en: {
        common: {
          loading: 'Loading...',
          error: 'Error',
          success: 'Success',
          cancel: 'Cancel',
          confirm: 'Confirm',
          save: 'Save',
          delete: 'Delete',
          edit: 'Edit',
          close: 'Close',
          next: 'Next',
          previous: 'Previous',
          search: 'Search',
          filter: 'Filter',
          sort: 'Sort',
          export: 'Export',
          import: 'Import',
          refresh: 'Refresh',
          settings: 'Settings',
          help: 'Help',
          logout: 'Logout',
          login: 'Login'
        },
        errors: {
          generic: 'An error occurred',
          network: 'Network error',
          unauthorized: 'Unauthorized access',
          forbidden: 'Access forbidden',
          notFound: 'Not found',
          serverError: 'Server error',
          validation: 'Validation error',
          timeout: 'Request timeout'
        },
        accessibility: {
          skipToContent: 'Skip to main content',
          skipToNavigation: 'Skip to navigation',
          skipToSearch: 'Skip to search',
          openMenu: 'Open menu',
          closeMenu: 'Close menu',
          toggleContrast: 'Toggle high contrast',
          increaseFontSize: 'Increase font size',
          decreaseFontSize: 'Decrease font size',
          screenReaderOnly: 'Screen reader only',
          newWindow: 'Opens in new window',
          required: 'Required field',
          optional: 'Optional field'
        },
        navigation: {
          home: 'Home',
          dashboard: 'Dashboard',
          profile: 'Profile',
          notifications: 'Notifications',
          messages: 'Messages',
          groups: 'Groups',
          cameras: 'Cameras',
          detections: 'Detections',
          analytics: 'Analytics',
          reports: 'Reports',
          admin: 'Administration'
        },
        detection: {
          confidence: 'Confidence',
          timestamp: 'Timestamp',
          camera: 'Camera',
          person: 'Person',
          detections: 'Detections',
          realtime: 'Real-time',
          history: 'History',
          filter: 'Filter detections',
          export: 'Export detections',
          noDetections: 'No detections found',
          loadingDetections: 'Loading detections...'
        }
      },
      es: {
        common: {
          loading: 'Cargando...',
          error: 'Error',
          success: 'Éxito',
          cancel: 'Cancelar',
          confirm: 'Confirmar',
          save: 'Guardar',
          delete: 'Eliminar',
          edit: 'Editar',
          close: 'Cerrar',
          next: 'Siguiente',
          previous: 'Anterior',
          search: 'Buscar',
          filter: 'Filtrar',
          sort: 'Ordenar',
          export: 'Exportar',
          import: 'Importar',
          refresh: 'Actualizar',
          settings: 'Configuración',
          help: 'Ayuda',
          logout: 'Cerrar sesión',
          login: 'Iniciar sesión'
        },
        errors: {
          generic: 'Ocurrió un error',
          network: 'Error de red',
          unauthorized: 'Acceso no autorizado',
          forbidden: 'Acceso prohibido',
          notFound: 'No encontrado',
          serverError: 'Error del servidor',
          validation: 'Error de validación',
          timeout: 'Tiempo de espera agotado'
        },
        accessibility: {
          skipToContent: 'Ir al contenido principal',
          skipToNavigation: 'Ir a la navegación',
          skipToSearch: 'Ir a la búsqueda',
          openMenu: 'Abrir menú',
          closeMenu: 'Cerrar menú',
          toggleContrast: 'Alternar alto contraste',
          increaseFontSize: 'Aumentar tamaño de fuente',
          decreaseFontSize: 'Disminuir tamaño de fuente',
          screenReaderOnly: 'Solo para lector de pantalla',
          newWindow: 'Se abre en nueva ventana',
          required: 'Campo requerido',
          optional: 'Campo opcional'
        },
        navigation: {
          home: 'Inicio',
          dashboard: 'Panel de control',
          profile: 'Perfil',
          notifications: 'Notificaciones',
          messages: 'Mensajes',
          groups: 'Grupos',
          cameras: 'Cámaras',
          detections: 'Detecciones',
          analytics: 'Análisis',
          reports: 'Reportes',
          admin: 'Administración'
        },
        detection: {
          confidence: 'Confianza',
          timestamp: 'Marca de tiempo',
          camera: 'Cámara',
          person: 'Persona',
          detections: 'Detecciones',
          realtime: 'Tiempo real',
          history: 'Historial',
          filter: 'Filtrar detecciones',
          export: 'Exportar detecciones',
          noDetections: 'No se encontraron detecciones',
          loadingDetections: 'Cargando detecciones...'
        }
      },
      fr: {
        common: {
          loading: 'Chargement...',
          error: 'Erreur',
          success: 'Succès',
          cancel: 'Annuler',
          confirm: 'Confirmer',
          save: 'Enregistrer',
          delete: 'Supprimer',
          edit: 'Modifier',
          close: 'Fermer',
          next: 'Suivant',
          previous: 'Précédent',
          search: 'Rechercher',
          filter: 'Filtrer',
          sort: 'Trier',
          export: 'Exporter',
          import: 'Importer',
          refresh: 'Actualiser',
          settings: 'Paramètres',
          help: 'Aide',
          logout: 'Déconnexion',
          login: 'Connexion'
        },
        errors: {
          generic: 'Une erreur est survenue',
          network: 'Erreur réseau',
          unauthorized: 'Accès non autorisé',
          forbidden: 'Accès interdit',
          notFound: 'Introuvable',
          serverError: 'Erreur serveur',
          validation: 'Erreur de validation',
          timeout: 'Délai d\'attente dépassé'
        },
        accessibility: {
          skipToContent: 'Aller au contenu principal',
          skipToNavigation: 'Aller à la navigation',
          skipToSearch: 'Aller à la recherche',
          openMenu: 'Ouvrir le menu',
          closeMenu: 'Fermer le menu',
          toggleContrast: 'Basculer le contraste élevé',
          increaseFontSize: 'Augmenter la taille de police',
          decreaseFontSize: 'Diminuer la taille de police',
          screenReaderOnly: 'Lecteur d\'écran uniquement',
          newWindow: 'S\'ouvre dans une nouvelle fenêtre',
          required: 'Champ requis',
          optional: 'Champ optionnel'
        },
        navigation: {
          home: 'Accueil',
          dashboard: 'Tableau de bord',
          profile: 'Profil',
          notifications: 'Notifications',
          messages: 'Messages',
          groups: 'Groupes',
          cameras: 'Caméras',
          detections: 'Détections',
          analytics: 'Analyses',
          reports: 'Rapports',
          admin: 'Administration'
        },
        detection: {
          confidence: 'Confiance',
          timestamp: 'Horodatage',
          camera: 'Caméra',
          person: 'Personne',
          detections: 'Détections',
          realtime: 'Temps réel',
          history: 'Historique',
          filter: 'Filtrer les détections',
          export: 'Exporter les détections',
          noDetections: 'Aucune détection trouvée',
          loadingDetections: 'Chargement des détections...'
        }
      }
    };

    // Load default translations
    Object.entries(defaultTranslations).forEach(([lang, translations]) => {
      Object.entries(translations).forEach(([namespace, resource]) => {
        this.addTranslation(lang, namespace, resource);
      });
    });

    this.currentContext = this.createContext(this.currentLanguage);
  }

  private updateDocumentLanguage(): void {
    document.documentElement.lang = this.currentLanguage;
    document.documentElement.dir = this.isRtl(this.currentLanguage) ? 'rtl' : 'ltr';
  }

  private setupLanguageObserver(): void {
    // Listen for language changes from system
    if (window.matchMedia) {
      // This is a simplified approach - in production you'd use more sophisticated detection
      window.addEventListener('languagechange', () => {
        this.detectBrowserLanguage();
        this.changeLanguage(this.currentLanguage);
      });
    }
  }

  private createContext(language: string): I18nContext {
    const isRtl = this.isRtl(language);
    const region = this.getRegionFromLanguage(language);
    
    return {
      language,
      direction: isRtl ? 'rtl' : 'ltr',
      region,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currency: this.getCurrencyFromRegion(region),
      numberFormat: new Intl.NumberFormat(language),
      dateFormat: new Intl.DateTimeFormat(language),
      timeFormat: new Intl.DateTimeFormat(language, { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      collator: new Intl.Collator(language)
    };
  }

  private isRtl(language: string): boolean {
    return this.config.rtlLanguages.includes(language);
  }

  private getRegionFromLanguage(language: string): string {
    const regions: Record<string, string> = {
      'en': 'US',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'ja': 'JP',
      'zh': 'CN',
      'ar': 'SA',
      'ru': 'RU',
      'pt': 'BR',
      'it': 'IT'
    };
    return regions[language] || 'US';
  }

  private getCurrencyFromRegion(region: string): string {
    const currencies: Record<string, string> = {
      'US': 'USD',
      'ES': 'EUR',
      'FR': 'EUR',
      'DE': 'EUR',
      'JP': 'JPY',
      'CN': 'CNY',
      'SA': 'SAR',
      'RU': 'RUB',
      'BR': 'BRL',
      'IT': 'EUR'
    };
    return currencies[region] || 'USD';
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private interpolateString(template: string, values: Record<string, any>): string {
    if (!this.config.enableInterpolation) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key] !== undefined ? String(values[key]) : match;
    });
  }

  private getPluralForm(count: number, language: string): string {
    if (!this.config.enablePluralisation) return 'other';

    const rules = this.pluralRules.get(language);
    if (!rules) return 'other';

    return rules.select(count);
  }

  private resolveTranslation(
    key: string, 
    language: string, 
    namespace: string = 'common'
  ): string | undefined {
    const translations = this.translations.get(namespace);
    if (!translations) return undefined;

    const langTranslations = translations[language];
    if (!langTranslations) return undefined;

    return this.getNestedValue(langTranslations, key);
  }

  // Public API
  public addTranslation(
    language: string, 
    namespace: string, 
    translations: TranslationResource
  ): void {
    if (!this.translations.has(namespace)) {
      this.translations.set(namespace, {});
    }

    const namespaceTranslations = this.translations.get(namespace)!;
    namespaceTranslations[language] = translations;
    this.loadedNamespaces.add(namespace);

    // Cache translations if enabled
    if (this.config.cacheTranslations) {
      try {
        localStorage.setItem(
          `i18n-${namespace}-${language}`,
          JSON.stringify(translations)
        );
      } catch (error) {
        console.error('Failed to cache translations:', error);
      }
    }
  }

  public async loadTranslations(
    language: string, 
    namespace: string
  ): Promise<void> {
    if (this.loadedNamespaces.has(namespace)) return;

    // Try to load from cache first
    if (this.config.cacheTranslations) {
      try {
        const cached = localStorage.getItem(`i18n-${namespace}-${language}`);
        if (cached) {
          const translations = JSON.parse(cached);
          this.addTranslation(language, namespace, translations);
          return;
        }
      } catch (error) {
        console.error('Failed to load cached translations:', error);
      }
    }

    // Load from remote source (mock implementation)
    try {
      const response = await fetch(`/api/translations/${language}/${namespace}`);
      if (response.ok) {
        const translations = await response.json();
        this.addTranslation(language, namespace, translations);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  public t(key: string, options: TranslationOptions = {}): string {
    const {
      count,
      context,
      defaultValue,
      interpolation = {},
      namespace = 'common',
      returnObjects = false,
      lng = this.currentLanguage
    } = options;

    // Handle pluralization
    let resolvedKey = key;
    if (count !== undefined && this.config.enablePluralisation) {
      const pluralForm = this.getPluralForm(count, lng);
      resolvedKey = `${key}_${pluralForm}`;
    }

    // Handle context
    if (context) {
      resolvedKey = `${resolvedKey}_${context}`;
    }

    // Try to resolve translation
    let translation = this.resolveTranslation(resolvedKey, lng, namespace);

    // Fallback to base key if plural/context key not found
    if (!translation && (count !== undefined || context)) {
      translation = this.resolveTranslation(key, lng, namespace);
    }

    // Fallback to fallback language
    if (!translation && lng !== this.config.fallbackLanguage) {
      translation = this.resolveTranslation(resolvedKey, this.config.fallbackLanguage, namespace);
    }

    // Use default value or return key
    if (!translation) {
      translation = defaultValue || key;
    }

    // Handle interpolation
    if (this.config.enableInterpolation && interpolation) {
      translation = this.interpolateString(translation, interpolation);
    }

    // Handle count interpolation
    if (count !== undefined) {
      translation = this.interpolateString(translation, { count });
    }

    return translation;
  }

  public changeLanguage(language: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.supportedLanguages.includes(language)) {
        console.warn(`Language ${language} is not supported`);
        resolve();
        return;
      }

      this.currentLanguage = language;
      this.currentContext = this.createContext(language);
      
      // Update document
      this.updateDocumentLanguage();
      
      // Persist preference
      if (this.config.persistLanguagePreference) {
        try {
          localStorage.setItem('i18n-language', language);
        } catch (error) {
          console.error('Failed to persist language preference:', error);
        }
      }

      // Notify observers
      this.observers.forEach(observer => observer(this.currentContext));
      
      resolve();
    });
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getContext(): I18nContext {
    return { ...this.currentContext };
  }

  public getSupportedLanguages(): string[] {
    return [...this.config.supportedLanguages];
  }

  public isLanguageSupported(language: string): boolean {
    return this.config.supportedLanguages.includes(language);
  }

  public formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.currentContext.numberFormat.format(value);
  }

  public formatDate(
    date: Date | number | string, 
    options?: Intl.DateTimeFormatOptions
  ): string {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    return this.currentContext.dateFormat.format(dateValue);
  }

  public formatTime(
    date: Date | number | string, 
    options?: Intl.DateTimeFormatOptions
  ): string {
    const dateValue = typeof date === 'string' ? new Date(date) : date;
    return this.currentContext.timeFormat.format(dateValue);
  }

  public formatCurrency(
    value: number, 
    currency?: string, 
    options?: Intl.NumberFormatOptions
  ): string {
    const currencyCode = currency || this.currentContext.currency;
    const formatter = new Intl.NumberFormat(this.currentLanguage, {
      style: 'currency',
      currency: currencyCode,
      ...options
    });
    return formatter.format(value);
  }

  public formatRelativeTime(
    date: Date | number | string, 
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    const dateValue = typeof date === 'string' ? new Date(date) : new Date(date);
    const now = new Date();
    const diffMs = dateValue.getTime() - now.getTime();
    
    const formatter = new Intl.RelativeTimeFormat(this.currentLanguage, options);
    
    // Simple relative time calculation
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, 'hour');
    } else {
      return formatter.format(diffDays, 'day');
    }
  }

  public sortStrings(strings: string[], options?: Intl.CollatorOptions): string[] {
    return strings.sort(this.currentContext.collator.compare);
  }

  public subscribe(observer: (context: I18nContext) => void): () => void {
    this.observers.push(observer);
    
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  public getConfig(): I18nConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<I18nConfig>): void {
    this.config = { ...this.config, ...config };
    this.currentContext = this.createContext(this.currentLanguage);
  }

  public getTranslationKeys(namespace: string = 'common'): string[] {
    const translations = this.translations.get(namespace);
    if (!translations || !translations[this.currentLanguage]) {
      return [];
    }

    const keys: string[] = [];
    const traverse = (obj: any, prefix: string = '') => {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object') {
          traverse(obj[key], fullKey);
        } else {
          keys.push(fullKey);
        }
      });
    };

    traverse(translations[this.currentLanguage]);
    return keys;
  }

  public hasTranslation(key: string, namespace: string = 'common'): boolean {
    return this.resolveTranslation(key, this.currentLanguage, namespace) !== undefined;
  }

  public getLoadedNamespaces(): string[] {
    return Array.from(this.loadedNamespaces);
  }

  public clearCache(): void {
    if (!this.config.cacheTranslations) return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('i18n-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear translation cache:', error);
    }
  }

  public destroy(): void {
    this.observers = [];
    this.translations.clear();
    this.loadedNamespaces.clear();
    this.pluralRules.clear();
  }
}

// Export service instance
export const i18nService = new I18nService();

// Export class for custom instances
export { I18nService };