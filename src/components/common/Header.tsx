// src/components/common/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
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
          <img src={logo} alt="SpotOn Logo" className="w-12 h-12 object-contain rounded-lg" />
          <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            SpotOn
          </div>
        </Link>

        {showBackButton && (
          <Link
            to={backUrl}
            className="text-gray-300 hover:text-orange-400 transition-colors flex items-center space-x-2 text-base font-medium"
          >
            <span>{backText}</span>
          </Link>
        )}
      </div>

      {/* Right side - Connection status and navigation */}
      <nav className="flex items-center space-x-6 text-base font-medium h-10">
        {/* Connection Status */}
        {connectionStatus && (
          <div
            className="flex items-center space-x-2 h-full pr-6 mr-4 border-r border-gray-700/60"
            data-testid="connection-indicator"
          >
            {typeof connectionStatus === 'string' ? (
              <span className="text-gray-300">{connectionStatus}</span>
            ) : (
              <>
                <div
                  className={`w-3 h-3 rounded-full ${connectionStatus.isConnected ? 'bg-green-400' : 'bg-red-400'
                    }`}
                />
                <span className="text-gray-300">{connectionStatus.statusText}</span>
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
              className="text-gray-300 hover:text-orange-400 transition-colors flex items-center h-full px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Analytics
            </Link>
            <Link
              to="/help"
              className="text-gray-300 hover:text-orange-400 transition-colors flex items-center h-full px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Help
            </Link>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
