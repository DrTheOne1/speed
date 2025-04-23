import { useToast } from '@chakra-ui/toast';

// Define error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

// Error class with additional context
export class AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: any;
  timestamp: Date;

  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, code?: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Function to determine error type from various error sources
export const getErrorType = (error: any): ErrorType => {
  if (error instanceof AppError) {
    return error.type;
  }

  // Check for network errors
  if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('axios')) {
    return ErrorType.NETWORK;
  }

  // Check for authentication errors
  if (error.message?.includes('auth') || error.message?.includes('login') || error.message?.includes('token')) {
    return ErrorType.AUTHENTICATION;
  }

  // Check for authorization errors
  if (error.message?.includes('permission') || error.message?.includes('access') || error.message?.includes('role')) {
    return ErrorType.AUTHORIZATION;
  }

  // Check for validation errors
  if (error.message?.includes('validation') || error.message?.includes('invalid') || error.message?.includes('required')) {
    return ErrorType.VALIDATION;
  }

  // Check for server errors
  if (error.status >= 500 || error.message?.includes('server')) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
};

// Function to format error message for display
export const formatErrorMessage = (error: any): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  if (error.error) {
    return error.error;
  }

  return 'An unknown error occurred';
};

// Function to handle errors globally
export const handleError = (error: any, showToast: boolean = true): AppError => {
  // Log the error to console
  console.error('Error caught by error handler:', error);

  // Determine error type
  const errorType = getErrorType(error);
  
  // Format error message
  const message = formatErrorMessage(error);
  
  // Create AppError instance
  const appError = new AppError(
    message,
    errorType,
    error.code || error.status?.toString(),
    error
  );

  // Show toast notification if requested
  if (showToast) {
    // We can't use hooks directly in a utility function
    // Instead, we'll log the error and let the component handle the toast
    console.error('Error that should show toast:', message);
  }

  return appError;
};

// Function to wrap async functions with error handling
export const withErrorHandling = <T>(fn: () => Promise<T>, showToast: boolean = true): Promise<T> => {
  return fn().catch(error => {
    handleError(error, showToast);
    throw error; // Re-throw to allow caller to handle if needed
  });
};

export default {
  ErrorType,
  AppError,
  getErrorType,
  formatErrorMessage,
  handleError,
  withErrorHandling
}; 