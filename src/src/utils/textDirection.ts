export const getTextDirection = (text: string | null): 'rtl' | 'ltr' => {
  if (!text) return 'ltr';
  
  try {
    const rtlChars = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    return rtlChars.test(text) ? 'rtl' : 'ltr';
  } catch (error) {
    console.error('Error detecting text direction:', error);
    return 'ltr';
  }
};

// Then use it in your Messages component
import { getTextDirection } from '../../utils/textDirection';

// Update the message cell
<span 
  className="truncate max-w-xs" 
  style={{ 
    direction: getTextDirection(message.message),
    unicodeBidi: 'isolate'
  }}
>
  {message.message}
</span>