// src/components/common/StatusCard.tsx
import React from 'react';

interface StatusCardProps {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  label,
  value,
  status = 'info',
  className = '',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'info':
      default:
        return 'text-blue-400';
    }
  };

  const getIndicatorColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'error':
        return 'bg-red-400';
      case 'info':
      default:
        return 'bg-blue-400';
    }
  };

  return (
    <div
      className={`bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`w-2 h-2 ${getIndicatorColor()} rounded-full`} />
      </div>
      <div className={`text-2xl font-bold ${getStatusColor()}`}>{value}</div>
    </div>
  );
};

export default StatusCard;
