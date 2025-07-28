import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  autoComplete?: string;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  className = '',
  id,
  name,
  required = false,
  autoComplete,
}) => {
  const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
  const errorClasses = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300';
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white';

  const classes = `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;

  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={classes}
        id={id}
        name={name}
        required={required}
        autoComplete={autoComplete}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;