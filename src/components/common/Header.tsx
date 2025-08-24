// src/components/common/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { EnvironmentId } from '../../types/api';

interface HeaderProps {
  environment?: EnvironmentId;
  showBackButton?: boolean;
  backText?: string;
  backUrl?: string;
  connectionStatus?:
    | string
    | {
        isConnected: boolean;
        statusText: string;
      };
  rightContent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  environment,
  showBackButton = false,
  backText = '← Back',
  backUrl = '/',
  connectionStatus,
  rightContent,
}) => {
  return (
    <header className="flex justify-between items-center p-6 backdrop-blur-sm bg-black/20">
      {/* Left side - Logo and back button */}
      <div className="flex items-center space-x-6">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            SpotOn
          </div>
        </Link>

        {showBackButton && (
          <Link
            to={backUrl}
            className="text-gray-300 hover:text-orange-400 transition-colors flex items-center space-x-2"
          >
            <span>{backText}</span>
          </Link>
        )}
      </div>

      {/* Right side - Connection status and navigation */}
      <nav className="flex items-center space-x-6">
        {/* Connection Status */}
        {connectionStatus && (
          <div className="flex items-center space-x-2" data-testid="connection-indicator">
            {typeof connectionStatus === 'string' ? (
              <span className="text-sm text-gray-300">{connectionStatus}</span>
            ) : (
              <>
                <div
                  className={`w-3 h-3 rounded-full ${
                    connectionStatus.isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-sm text-gray-300">{connectionStatus.statusText}</span>
              </>
            )}
          </div>
        )}

        {/* Custom right content */}
        {rightContent}

        {/* Default navigation links */}
        {!rightContent && (
          <>
            <Link
              to={`/analytics${environment ? `?environment=${environment}` : ''}`}
              className="text-gray-300 hover:text-orange-400 transition-colors"
            >
              Analytics
            </Link>
            <Link to="/help" className="text-gray-300 hover:text-orange-400 transition-colors">
              Help
            </Link>
            <Link to="/about" className="text-gray-300 hover:text-orange-400 transition-colors">
              About
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
