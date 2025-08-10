// src/components/common/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'orange' | 'blue' | 'green' | 'white';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'orange',
  text,
  className = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4 border-2';
      case 'large':
        return 'w-8 h-8 border-4';
      case 'medium':
      default:
        return 'w-6 h-6 border-2';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'border-blue-400 border-t-transparent';
      case 'green':
        return 'border-green-400 border-t-transparent';
      case 'white':
        return 'border-white border-t-transparent';
      case 'orange':
      default:
        return 'border-orange-400 border-t-transparent';
    }
  };

  const getTextColor = () => {
    switch (color) {
      case 'blue':
        return 'text-blue-400';
      case 'green':
        return 'text-green-400';
      case 'white':
        return 'text-white';
      case 'orange':
      default:
        return 'text-orange-400';
    }
  };

  if (text) {
    return (
      <div className={`inline-flex items-center space-x-3 ${className}`}>
        <div className={`animate-spin ${getSizeClasses()} ${getColorClasses()} rounded-full`} />
        <span className={`${getTextColor()}`}>{text}</span>
      </div>
    );
  }

  return (
    <div
      className={`animate-spin ${getSizeClasses()} ${getColorClasses()} rounded-full ${className}`}
    />
  );
};

export default LoadingSpinner;
