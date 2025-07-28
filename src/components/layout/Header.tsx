import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = true,
  backTo = '/',
  className = ''
}) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className={`flex items-center justify-between mb-4 flex-shrink-0 ${className}`}>
      {showBackButton && !isHomePage ? (
        <Link 
          to={backTo} 
          className="flex items-center text-lg text-gray-200 hover:text-orange-400 transition-colors"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
          Back
        </Link>
      ) : (
        <div></div>
      )}
      
      {title && (
        <h1 className="text-2xl font-semibold text-gray-200">
          {title}
        </h1>
      )}
      
      <div className="flex items-center space-x-4">
        {/* Future: Add user menu, settings, etc. */}
      </div>
    </header>
  );
};

export default Header;