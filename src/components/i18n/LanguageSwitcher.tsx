import React, { useState, useRef, useEffect } from 'react';
import { useLanguageSwitcher, useI18n } from '../../hooks/useI18n';
import { accessibilityService } from '../../services/accessibilityService';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'select' | 'buttons';
  showNativeNames?: boolean;
  showFlags?: boolean;
  compact?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  showNativeNames = true,
  showFlags = true,
  compact = false,
  className = '',
  ariaLabel
}) => {
  const { currentLanguage, availableLanguages, changeLanguage } = useLanguageSwitcher();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Flag emoji mapping
  const flagEmojis: Record<string, string> = {
    en: '🇺🇸',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    ja: '🇯🇵',
    zh: '🇨🇳',
    ar: '🇸🇦',
    ru: '🇷🇺',
    pt: '🇧🇷',
    it: '🇮🇹'
  };

  const currentLanguageData = availableLanguages.find(lang => lang.code === currentLanguage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await changeLanguage(languageCode);
      const newLanguage = availableLanguages.find(lang => lang.code === languageCode);
      accessibilityService.announce(
        t('language.changed', { 
          language: newLanguage?.name || languageCode,
          namespace: 'accessibility'
        })
      );
    } catch (error) {
      console.error('Failed to change language:', error);
      accessibilityService.announce(
        t('language.changeFailed', { namespace: 'accessibility' })
      );
    } finally {
      setIsChanging(false);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setIsOpen(true);
        // Focus first option
        setTimeout(() => {
          const firstOption = dropdownRef.current?.querySelector('[role="option"]') as HTMLElement;
          firstOption?.focus();
        }, 0);
        break;
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent, languageCode: string) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleLanguageChange(languageCode);
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        const nextOption = (event.target as HTMLElement).nextElementSibling as HTMLElement;
        if (nextOption) {
          nextOption.focus();
        } else {
          // Loop to first option
          const firstOption = dropdownRef.current?.querySelector('[role="option"]') as HTMLElement;
          firstOption?.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevOption = (event.target as HTMLElement).previousElementSibling as HTMLElement;
        if (prevOption) {
          prevOption.focus();
        } else {
          // Loop to last option
          const options = dropdownRef.current?.querySelectorAll('[role="option"]');
          const lastOption = options?.[options.length - 1] as HTMLElement;
          lastOption?.focus();
        }
        break;
    }
  };

  if (variant === 'select') {
    return (
      <div className={`language-switcher-select ${className}`}>
        <label htmlFor="language-select" className="sr-only">
          {ariaLabel || t('language.select', { namespace: 'accessibility' })}
        </label>
        <select
          id="language-select"
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={isChanging}
          className="language-select"
          aria-label={ariaLabel || t('language.select', { namespace: 'accessibility' })}
        >
          {availableLanguages.map(language => (
            <option key={language.code} value={language.code}>
              {showFlags && flagEmojis[language.code] ? `${flagEmojis[language.code]} ` : ''}
              {showNativeNames ? language.nativeName : language.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div 
        className={`language-switcher-buttons ${className}`}
        role="radiogroup"
        aria-label={ariaLabel || t('language.select', { namespace: 'accessibility' })}
      >
        {availableLanguages.map(language => (
          <button
            key={language.code}
            type="button"
            role="radio"
            aria-checked={language.code === currentLanguage}
            onClick={() => handleLanguageChange(language.code)}
            disabled={isChanging}
            className={`language-button ${language.code === currentLanguage ? 'active' : ''}`}
            title={language.name}
            aria-label={`${t('language.switchTo', { namespace: 'accessibility' })} ${language.name}`}
          >
            {showFlags && flagEmojis[language.code] && (
              <span className="flag" aria-hidden="true">
                {flagEmojis[language.code]}
              </span>
            )}
            {!compact && (
              <span className="language-name">
                {showNativeNames ? language.nativeName : language.name}
              </span>
            )}
            {compact && !showFlags && (
              <span className="language-code">
                {language.code.toUpperCase()}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`language-switcher-dropdown ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`language-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={isChanging}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || t('language.current', { 
          language: currentLanguageData?.name || currentLanguage,
          namespace: 'accessibility'
        })}
      >
        <span className="language-current">
          {showFlags && flagEmojis[currentLanguage] && (
            <span className="flag" aria-hidden="true">
              {flagEmojis[currentLanguage]}
            </span>
          )}
          <span className="language-name">
            {compact 
              ? currentLanguage.toUpperCase()
              : (showNativeNames ? currentLanguageData?.nativeName : currentLanguageData?.name) || currentLanguage
            }
          </span>
        </span>
        <span className="dropdown-arrow" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          className="language-dropdown"
          role="listbox"
          aria-label={t('language.available', { namespace: 'accessibility' })}
        >
          {availableLanguages.map(language => (
            <button
              key={language.code}
              type="button"
              role="option"
              aria-selected={language.code === currentLanguage}
              onClick={() => handleLanguageChange(language.code)}
              onKeyDown={(e) => handleOptionKeyDown(e, language.code)}
              className={`language-option ${language.code === currentLanguage ? 'selected' : ''}`}
              tabIndex={0}
              aria-label={`${t('language.switchTo', { namespace: 'accessibility' })} ${language.name}`}
            >
              {showFlags && flagEmojis[language.code] && (
                <span className="flag" aria-hidden="true">
                  {flagEmojis[language.code]}
                </span>
              )}
              <span className="language-info">
                <span className="language-name">
                  {language.name}
                </span>
                {showNativeNames && language.name !== language.nativeName && (
                  <span className="language-native">
                    {language.nativeName}
                  </span>
                )}
              </span>
              {language.code === currentLanguage && (
                <span className="checkmark" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isChanging && (
        <div className="language-loading" aria-live="polite">
          {t('language.changing', { namespace: 'accessibility' })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;