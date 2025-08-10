// src/components/accessibility/KeyboardNavigation.tsx
import React, { useCallback, useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';

// Keyboard shortcut definitions
interface KeyboardShortcut {
  keys: string[];
  description: string;
  handler: () => void;
  global?: boolean;
  category?: string;
}

interface KeyboardNavigationProps {
  shortcuts?: KeyboardShortcut[];
  children: React.ReactNode;
  disabled?: boolean;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  shortcuts = [],
  children,
  disabled = false,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled || !settings.keyboardNavigation) return;

      for (const shortcut of shortcuts) {
        const keysPressed = shortcut.keys.every((key) => {
          switch (key.toLowerCase()) {
            case 'ctrl':
              return event.ctrlKey || event.metaKey;
            case 'alt':
              return event.altKey;
            case 'shift':
              return event.shiftKey;
            case 'meta':
              return event.metaKey;
            default:
              return event.key.toLowerCase() === key.toLowerCase();
          }
        });

        if (keysPressed) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.handler();

          if (shortcut.description) {
            announceToScreenReader(`Activated: ${shortcut.description}`);
          }
          break;
        }
      }
    },
    [shortcuts, disabled, settings.keyboardNavigation, announceToScreenReader]
  );

  useEffect(() => {
    if (shortcuts.some((s) => s.global)) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, shortcuts]);

  if (shortcuts.some((s) => !s.global)) {
    return <div onKeyDown={handleKeyDown as any}>{children}</div>;
  }

  return <>{children}</>;
};

// Predefined keyboard shortcuts for common actions
export const createShortcuts = {
  // Navigation shortcuts
  navigation: {
    home: (handler: () => void): KeyboardShortcut => ({
      keys: ['Home'],
      description: 'Go to beginning',
      handler,
    }),
    end: (handler: () => void): KeyboardShortcut => ({
      keys: ['End'],
      description: 'Go to end',
      handler,
    }),
    pageUp: (handler: () => void): KeyboardShortcut => ({
      keys: ['PageUp'],
      description: 'Previous page',
      handler,
    }),
    pageDown: (handler: () => void): KeyboardShortcut => ({
      keys: ['PageDown'],
      description: 'Next page',
      handler,
    }),
  },

  // Media controls
  media: {
    playPause: (handler: () => void): KeyboardShortcut => ({
      keys: [' '],
      description: 'Play/Pause',
      handler,
    }),
    mute: (handler: () => void): KeyboardShortcut => ({
      keys: ['m'],
      description: 'Toggle mute',
      handler,
    }),
    fullscreen: (handler: () => void): KeyboardShortcut => ({
      keys: ['f'],
      description: 'Toggle fullscreen',
      handler,
    }),
  },

  // Application shortcuts
  app: {
    search: (handler: () => void): KeyboardShortcut => ({
      keys: ['Ctrl', '/'],
      description: 'Search',
      handler,
      global: true,
    }),
    settings: (handler: () => void): KeyboardShortcut => ({
      keys: ['Ctrl', ','],
      description: 'Open settings',
      handler,
      global: true,
    }),
    help: (handler: () => void): KeyboardShortcut => ({
      keys: ['?'],
      description: 'Show help',
      handler,
      global: true,
    }),
  },

  // Selection shortcuts
  selection: {
    selectAll: (handler: () => void): KeyboardShortcut => ({
      keys: ['Ctrl', 'a'],
      description: 'Select all',
      handler,
    }),
    delete: (handler: () => void): KeyboardShortcut => ({
      keys: ['Delete'],
      description: 'Delete selected',
      handler,
    }),
    escape: (handler: () => void): KeyboardShortcut => ({
      keys: ['Escape'],
      description: 'Cancel/Close',
      handler,
    }),
  },
};

// Keyboard shortcuts help dialog
interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  isOpen,
  onClose,
}) => {
  const { trapFocus } = useAccessibility();
  const dialogRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const cleanup = trapFocus(dialogRef.current);
      return cleanup;
    }
  }, [isOpen, trapFocus]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const formatKeys = (keys: string[]) => {
    return keys
      .map((key) => {
        switch (key.toLowerCase()) {
          case 'ctrl':
            return 'Ctrl';
          case 'alt':
            return 'Alt';
          case 'shift':
            return 'Shift';
          case 'meta':
            return navigator.platform.includes('Mac') ? 'Cmd' : 'Win';
          default:
            return key;
        }
      })
      .join(' + ');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={dialogRef}
        className="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            aria-label="Close shortcuts dialog"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-lg font-medium text-orange-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-gray-700 rounded"
                  >
                    <span className="text-gray-200 text-sm">{shortcut.description}</span>
                    <kbd className="inline-flex items-center px-3 py-1 bg-gray-600 text-gray-200 text-sm font-medium rounded border border-gray-500">
                      {formatKeys(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-600 text-sm text-gray-400">
          <p>
            Press <kbd className="px-2 py-1 bg-gray-600 rounded">Escape</kbd> to close this dialog.
          </p>
        </div>
      </div>
    </div>
  );
};

// Hook for managing keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[] = []) {
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const toggleHelp = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const helpShortcut: KeyboardShortcut = {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    handler: toggleHelp,
    global: true,
    category: 'Help',
  };

  const allShortcuts = React.useMemo(() => [...shortcuts, helpShortcut], [shortcuts, helpShortcut]);

  return {
    shortcuts: allShortcuts,
    isHelpOpen,
    toggleHelp,
    closeHelp: () => setIsHelpOpen(false),
  };
}

// Accessible button with keyboard support
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  onClick,
  onKeyDown,
  ...props
}) => {
  const { announceToScreenReader } = useAccessibility();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      // Handle Enter and Space key activation
      if ((e.key === 'Enter' || e.key === ' ') && !disabled && !loading) {
        e.preventDefault();
        onClick?.(e as any);
      }

      onKeyDown?.(e);
    },
    [onClick, onKeyDown, disabled, loading]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) {
        announceToScreenReader('Button is loading, please wait');
        return;
      }

      onClick?.(e);
    },
    [onClick, loading, announceToScreenReader]
  );

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-500 text-gray-200';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-700 text-gray-300';
      default:
        return 'bg-orange-500 hover:bg-orange-600 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1 text-sm';
      case 'large':
        return 'px-6 py-3 text-lg';
      case 'medium':
      default:
        return 'px-4 py-2 text-base';
    }
  };

  return (
    <button
      type="button"
      className={`
        relative inline-flex items-center justify-center
        rounded-lg font-medium
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className={`flex items-center space-x-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {icon && iconPosition === 'left' && <span aria-hidden="true">{icon}</span>}
        <span>{children}</span>
        {icon && iconPosition === 'right' && <span aria-hidden="true">{icon}</span>}
      </div>
    </button>
  );
};
