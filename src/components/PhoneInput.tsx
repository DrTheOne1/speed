import { useState, useEffect, useRef } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string;
  id?: string;
  name?: string;
}

// Comprehensive list of countries with dialing codes
const countries = [
  { code: 'AF', name: 'Afghanistan', dial: '+93' },
  { code: 'AL', name: 'Albania', dial: '+355' },
  { code: 'DZ', name: 'Algeria', dial: '+213' },
  { code: 'AD', name: 'Andorra', dial: '+376' },
  { code: 'AO', name: 'Angola', dial: '+244' },
  { code: 'AR', name: 'Argentina', dial: '+54' },
  { code: 'AM', name: 'Armenia', dial: '+374' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'AZ', name: 'Azerbaijan', dial: '+994' },
  { code: 'BH', name: 'Bahrain', dial: '+973' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'BY', name: 'Belarus', dial: '+375' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'BZ', name: 'Belize', dial: '+501' },
  { code: 'BJ', name: 'Benin', dial: '+229' },
  { code: 'BT', name: 'Bhutan', dial: '+975' },
  { code: 'BO', name: 'Bolivia', dial: '+591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial: '+387' },
  { code: 'BW', name: 'Botswana', dial: '+267' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'BN', name: 'Brunei', dial: '+673' },
  { code: 'BG', name: 'Bulgaria', dial: '+359' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226' },
  { code: 'BI', name: 'Burundi', dial: '+257' },
  { code: 'KH', name: 'Cambodia', dial: '+855' },
  { code: 'CM', name: 'Cameroon', dial: '+237' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'CV', name: 'Cape Verde', dial: '+238' },
  { code: 'CF', name: 'Central African Republic', dial: '+236' },
  { code: 'TD', name: 'Chad', dial: '+235' },
  { code: 'CL', name: 'Chile', dial: '+56' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'CO', name: 'Colombia', dial: '+57' },
  { code: 'KM', name: 'Comoros', dial: '+269' },
  { code: 'CG', name: 'Congo', dial: '+242' },
  { code: 'CD', name: 'Congo, DRC', dial: '+243' },
  { code: 'CR', name: 'Costa Rica', dial: '+506' },
  { code: 'HR', name: 'Croatia', dial: '+385' },
  { code: 'CU', name: 'Cuba', dial: '+53' },
  { code: 'CY', name: 'Cyprus', dial: '+357' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'DJ', name: 'Djibouti', dial: '+253' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1' },
  { code: 'EC', name: 'Ecuador', dial: '+593' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'SV', name: 'El Salvador', dial: '+503' },
  { code: 'GQ', name: 'Equatorial Guinea', dial: '+240' },
  { code: 'ER', name: 'Eritrea', dial: '+291' },
  { code: 'EE', name: 'Estonia', dial: '+372' },
  { code: 'ET', name: 'Ethiopia', dial: '+251' },
  { code: 'FJ', name: 'Fiji', dial: '+679' },
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'GA', name: 'Gabon', dial: '+241' },
  { code: 'GM', name: 'Gambia', dial: '+220' },
  { code: 'GE', name: 'Georgia', dial: '+995' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'GL', name: 'Greenland', dial: '+299' },
  { code: 'GT', name: 'Guatemala', dial: '+502' },
  { code: 'GN', name: 'Guinea', dial: '+224' },
  { code: 'GW', name: 'Guinea-Bissau', dial: '+245' },
  { code: 'GY', name: 'Guyana', dial: '+592' },
  { code: 'HT', name: 'Haiti', dial: '+509' },
  { code: 'HN', name: 'Honduras', dial: '+504' },
  { code: 'HK', name: 'Hong Kong', dial: '+852' },
  { code: 'HU', name: 'Hungary', dial: '+36' },
  { code: 'IS', name: 'Iceland', dial: '+354' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'IR', name: 'Iran', dial: '+98' },
  { code: 'IQ', name: 'Iraq', dial: '+964' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'IL', name: 'Israel', dial: '+972' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'CI', name: 'Ivory Coast', dial: '+225' },
  { code: 'JM', name: 'Jamaica', dial: '+1' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'JO', name: 'Jordan', dial: '+962' },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'KI', name: 'Kiribati', dial: '+686' },
  { code: 'KW', name: 'Kuwait', dial: '+965' },
  { code: 'KG', name: 'Kyrgyzstan', dial: '+996' },
  { code: 'LA', name: 'Laos', dial: '+856' },
  { code: 'LV', name: 'Latvia', dial: '+371' },
  { code: 'LB', name: 'Lebanon', dial: '+961' },
  { code: 'LS', name: 'Lesotho', dial: '+266' },
  { code: 'LR', name: 'Liberia', dial: '+231' },
  { code: 'LY', name: 'Libya', dial: '+218' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423' },
  { code: 'LT', name: 'Lithuania', dial: '+370' },
  { code: 'LU', name: 'Luxembourg', dial: '+352' },
  { code: 'MO', name: 'Macau', dial: '+853' },
  { code: 'MK', name: 'Macedonia', dial: '+389' },
  { code: 'MG', name: 'Madagascar', dial: '+261' },
  { code: 'MW', name: 'Malawi', dial: '+265' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'MV', name: 'Maldives', dial: '+960' },
  { code: 'ML', name: 'Mali', dial: '+223' },
  { code: 'MT', name: 'Malta', dial: '+356' },
  { code: 'MH', name: 'Marshall Islands', dial: '+692' },
  { code: 'MR', name: 'Mauritania', dial: '+222' },
  { code: 'MU', name: 'Mauritius', dial: '+230' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'FM', name: 'Micronesia', dial: '+691' },
  { code: 'MD', name: 'Moldova', dial: '+373' },
  { code: 'MC', name: 'Monaco', dial: '+377' },
  { code: 'MN', name: 'Mongolia', dial: '+976' },
  { code: 'ME', name: 'Montenegro', dial: '+382' },
  { code: 'MA', name: 'Morocco', dial: '+212' },
  { code: 'MZ', name: 'Mozambique', dial: '+258' },
  { code: 'MM', name: 'Myanmar', dial: '+95' },
  { code: 'NA', name: 'Namibia', dial: '+264' },
  { code: 'NR', name: 'Nauru', dial: '+674' },
  { code: 'NP', name: 'Nepal', dial: '+977' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'NI', name: 'Nicaragua', dial: '+505' },
  { code: 'NE', name: 'Niger', dial: '+227' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'KP', name: 'North Korea', dial: '+850' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'OM', name: 'Oman', dial: '+968' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'PW', name: 'Palau', dial: '+680' },
  { code: 'PS', name: 'Palestine', dial: '+970' },
  { code: 'PA', name: 'Panama', dial: '+507' },
  { code: 'PG', name: 'Papua New Guinea', dial: '+675' },
  { code: 'PY', name: 'Paraguay', dial: '+595' },
  { code: 'PE', name: 'Peru', dial: '+51' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'QA', name: 'Qatar', dial: '+974' },
  { code: 'RO', name: 'Romania', dial: '+40' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'KN', name: 'Saint Kitts and Nevis', dial: '+1' },
  { code: 'LC', name: 'Saint Lucia', dial: '+1' },
  { code: 'VC', name: 'Saint Vincent', dial: '+1' },
  { code: 'WS', name: 'Samoa', dial: '+685' },
  { code: 'SM', name: 'San Marino', dial: '+378' },
  { code: 'ST', name: 'Sao Tome and Principe', dial: '+239' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'SN', name: 'Senegal', dial: '+221' },
  { code: 'RS', name: 'Serbia', dial: '+381' },
  { code: 'SC', name: 'Seychelles', dial: '+248' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'SK', name: 'Slovakia', dial: '+421' },
  { code: 'SI', name: 'Slovenia', dial: '+386' },
  { code: 'SB', name: 'Solomon Islands', dial: '+677' },
  { code: 'SO', name: 'Somalia', dial: '+252' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'SS', name: 'South Sudan', dial: '+211' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94' },
  { code: 'SD', name: 'Sudan', dial: '+249' },
  { code: 'SR', name: 'Suriname', dial: '+597' },
  { code: 'SZ', name: 'Swaziland', dial: '+268' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'SY', name: 'Syria', dial: '+963' },
  { code: 'TW', name: 'Taiwan', dial: '+886' },
  { code: 'TJ', name: 'Tajikistan', dial: '+992' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'TL', name: 'Timor-Leste', dial: '+670' },
  { code: 'TG', name: 'Togo', dial: '+228' },
  { code: 'TO', name: 'Tonga', dial: '+676' },
  { code: 'TT', name: 'Trinidad and Tobago', dial: '+1' },
  { code: 'TN', name: 'Tunisia', dial: '+216' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'TM', name: 'Turkmenistan', dial: '+993' },
  { code: 'TV', name: 'Tuvalu', dial: '+688' },
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'UY', name: 'Uruguay', dial: '+598' },
  { code: 'UZ', name: 'Uzbekistan', dial: '+998' },
  { code: 'VU', name: 'Vanuatu', dial: '+678' },
  { code: 'VA', name: 'Vatican City', dial: '+379' },
  { code: 'VE', name: 'Venezuela', dial: '+58' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
  { code: 'YE', name: 'Yemen', dial: '+967' },
  { code: 'ZM', name: 'Zambia', dial: '+260' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function PhoneInput({ value, onChange, className = '', error, id, name }: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(() => {
    const savedCountry = localStorage.getItem('lastSelectedCountry');
    return savedCountry || 'US';
  });
  const [localNumber, setLocalNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (value) {
      const phoneNumber = parsePhoneNumberFromString(value);
      if (phoneNumber) {
        const country = phoneNumber.country as string;
        const national = phoneNumber.nationalNumber;
        setSelectedCountry(country);
        setLocalNumber(national);
      }
    }
  }, [value]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    localStorage.setItem('lastSelectedCountry', countryCode);
    
    const country = countries.find(c => c.code === countryCode);
    if (country && localNumber) {
      const fullNumber = `${country.dial}${localNumber.replace(/[^\d]/g, '')}`;
      onChange(fullNumber);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d]/g, '');
    setLocalNumber(newNumber);
    
    const country = countries.find(c => c.code === selectedCountry);
    if (country && newNumber) {
      const fullNumber = `${country.dial}${newNumber}`;
      onChange(fullNumber);
    } else {
      onChange('');
    }
  };

  const scrollToOption = (index: number) => {
    if (selectRef.current) {
      const optionHeight = 32; // Approximate height of each option
      const scrollPosition = index * optionHeight;
      const selectHeight = selectRef.current.clientHeight;
      const currentScroll = selectRef.current.scrollTop;
      const bottomEdge = currentScroll + selectHeight;
      
      // Only scroll if the option is not already visible
      if (scrollPosition < currentScroll || scrollPosition > bottomEdge - optionHeight) {
        // Center the selected option if possible
        const centerPosition = scrollPosition - (selectHeight / 2) + (optionHeight / 2);
        selectRef.current.scrollTop = Math.max(0, centerPosition);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      
      // Clear any existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Update search term
      const newSearchTerm = searchTerm + e.key.toLowerCase();
      setSearchTerm(newSearchTerm);

      // Find matching country
      const matchingCountryIndex = countries.findIndex(country => 
        country.name.toLowerCase().startsWith(newSearchTerm)
      );

      if (matchingCountryIndex >= 0 && selectRef.current) {
        selectRef.current.selectedIndex = matchingCountryIndex;
        handleCountryChange(countries[matchingCountryIndex].code);
        scrollToOption(matchingCountryIndex);
      }

      // Clear search term after delay
      const timeout = setTimeout(() => {
        setSearchTerm('');
      }, 1000);
      setSearchTimeout(timeout);
    }
  };

  useEffect(() => {
    const select = selectRef.current;
    if (select) {
      select.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (select) {
        select.removeEventListener('keydown', handleKeyDown);
      }
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTerm]);

  // Set initial scroll position to selected country
  useEffect(() => {
    const selectedIndex = countries.findIndex(country => country.code === selectedCountry);
    if (selectedIndex >= 0) {
      scrollToOption(selectedIndex);
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        <select
          ref={selectRef}
          value={selectedCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="rounded-l-md border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
          id={id ? `${id}-country` : undefined}
          name={name ? `${name}-country` : undefined}
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.dial} {country.name}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          className="flex-1 rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Enter phone number"
          id={id}
          name={name}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}