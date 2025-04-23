// Global error handler to catch unhandled errors and rejections
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Create a visible error message on the screen
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.top = '0';
    errorContainer.style.left = '0';
    errorContainer.style.right = '0';
    errorContainer.style.padding = '20px';
    errorContainer.style.backgroundColor = '#ffebee';
    errorContainer.style.color = '#c62828';
    errorContainer.style.zIndex = '9999';
    errorContainer.style.fontFamily = 'Arial, sans-serif';
    errorContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    const errorTitle = document.createElement('h2');
    errorTitle.textContent = 'Unhandled Promise Rejection';
    errorTitle.style.margin = '0 0 10px 0';
    
    const errorMessage = document.createElement('pre');
    errorMessage.textContent = JSON.stringify(event.reason, null, 2);
    errorMessage.style.margin = '0';
    errorMessage.style.whiteSpace = 'pre-wrap';
    errorMessage.style.wordBreak = 'break-word';
    
    errorContainer.appendChild(errorTitle);
    errorContainer.appendChild(errorMessage);
    document.body.appendChild(errorContainer);
    
    // Prevent the default handler
    event.preventDefault();
  });
  
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    
    // Create a visible error message on the screen
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.top = '0';
    errorContainer.style.left = '0';
    errorContainer.style.right = '0';
    errorContainer.style.padding = '20px';
    errorContainer.style.backgroundColor = '#ffebee';
    errorContainer.style.color = '#c62828';
    errorContainer.style.zIndex = '9999';
    errorContainer.style.fontFamily = 'Arial, sans-serif';
    errorContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    
    const errorTitle = document.createElement('h2');
    errorTitle.textContent = 'Uncaught Error';
    errorTitle.style.margin = '0 0 10px 0';
    
    const errorMessage = document.createElement('pre');
    errorMessage.textContent = `${event.error?.message || 'Unknown error'}\n\nStack: ${event.error?.stack || 'No stack trace'}`;
    errorMessage.style.margin = '0';
    errorMessage.style.whiteSpace = 'pre-wrap';
    errorMessage.style.wordBreak = 'break-word';
    
    errorContainer.appendChild(errorTitle);
    errorContainer.appendChild(errorMessage);
    document.body.appendChild(errorContainer);
    
    // Prevent the default handler
    event.preventDefault();
  });
  
  // Log when the app starts
  console.log('Global error handlers initialized');
};

export default setupGlobalErrorHandlers; 