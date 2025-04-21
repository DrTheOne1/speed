// Add this function somewhere in your ScheduledMessages component, before the return statement
const checkPendingMessages = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not authenticated");
      return;
    }

    setIsProcessing(true);
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-scheduled-messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      toast.success(`Processed: ${data.processed || 0} messages`);
      refetch(); // Refresh the messages list
    } else {
      const errorData = await response.text();
      toast.error(`Processing failed: ${errorData}`);
    }
  } catch (error) {
    console.error('Error processing messages:', error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};

// Add this state at the top of your component with other useState hooks
const [isProcessing, setIsProcessing] = useState(false);