import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const countryCodes = [
  { code: '+1', label: 'United States' },
  { code: '+44', label: 'United Kingdom' },
  { code: '+91', label: 'India' },
  { code: '+86', label: 'China' },
  { code: '+61', label: 'Australia' },
  { code: '+33', label: 'France' },
  { code: '+49', label: 'Germany' },
  { code: '+81', label: 'Japan' },
  { code: '+7', label: 'Russia' },
  { code: '+55', label: 'Brazil' },
  // Add all countries here
  { code: '+355', label: 'Albania' },
  { code: '+376', label: 'Andorra' },
  { code: '+244', label: 'Angola' },
  { code: '+1264', label: 'Anguilla' },
  { code: '+672', label: 'Antarctica' },
  { code: '+1268', label: 'Antigua and Barbuda' },
  { code: '+54', label: 'Argentina' },
  { code: '+374', label: 'Armenia' },
  { code: '+297', label: 'Aruba' },
  { code: '+61', label: 'Australia' },
  { code: '+43', label: 'Austria' },
  { code: '+994', label: 'Azerbaijan' },
  { code: '+1242', label: 'Bahamas' },
  { code: '+973', label: 'Bahrain' },
  { code: '+880', label: 'Bangladesh' },
  { code: '+1246', label: 'Barbados' },
  { code: '+375', label: 'Belarus' },
  { code: '+32', label: 'Belgium' },
  { code: '+501', label: 'Belize' },
  { code: '+229', label: 'Benin' },
  { code: '+1441', label: 'Bermuda' },
  { code: '+975', label: 'Bhutan' },
  { code: '+591', label: 'Bolivia' },
  { code: '+387', label: 'Bosnia and Herzegovina' },
  { code: '+267', label: 'Botswana' },
  { code: '+55', label: 'Brazil' },
  { code: '+673', label: 'Brunei' },
  { code: '+359', label: 'Bulgaria' },
  { code: '+226', label: 'Burkina Faso' },
  { code: '+257', label: 'Burundi' },
  { code: '+855', label: 'Cambodia' },
  { code: '+237', label: 'Cameroon' },
  { code: '+1', label: 'Canada' },
  { code: '+238', label: 'Cape Verde' },
  { code: '+1345', label: 'Cayman Islands' },
  { code: '+236', label: 'Central African Republic' },
  { code: '+235', label: 'Chad' },
  { code: '+56', label: 'Chile' },
  { code: '+86', label: 'China' },
  { code: '+57', label: 'Colombia' },
  { code: '+269', label: 'Comoros' },
  { code: '+242', label: 'Congo' },
  { code: '+682', label: 'Cook Islands' },
  { code: '+506', label: 'Costa Rica' },
  { code: '+385', label: 'Croatia' },
  { code: '+53', label: 'Cuba' },
  { code: '+357', label: 'Cyprus' },
  { code: '+420', label: 'Czech Republic' },
  { code: '+45', label: 'Denmark' },
  { code: '+253', label: 'Djibouti' },
  { code: '+1767', label: 'Dominica' },
  { code: '+1809', label: 'Dominican Republic' },
  { code: '+593', label: 'Ecuador' },
  { code: '+20', label: 'Egypt' },
  { code: '+503', label: 'El Salvador' },
  { code: '+240', label: 'Equatorial Guinea' },
  { code: '+291', label: 'Eritrea' },
  { code: '+372', label: 'Estonia' },
  { code: '+251', label: 'Ethiopia' },
  { code: '+500', label: 'Falkland Islands' },
  { code: '+298', label: 'Faroe Islands' },
  { code: '+679', label: 'Fiji' },
  { code: '+358', label: 'Finland' },
  { code: '+33', label: 'France' },
  { code: '+689', label: 'French Polynesia' },
  { code: '+241', label: 'Gabon' },
  { code: '+220', label: 'Gambia' },
  { code: '+995', label: 'Georgia' },
  { code: '+49', label: 'Germany' },
  { code: '+233', label: 'Ghana' },
  { code: '+350', label: 'Gibraltar' },
  { code: '+30', label: 'Greece' },
  { code: '+299', label: 'Greenland' },
  { code: '+1473', label: 'Grenada' },
  { code: '+502', label: 'Guatemala' },
  { code: '+44', label: 'Guernsey' },
  { code: '+224', label: 'Guinea' },
  { code: '+245', label: 'Guinea-Bissau' },
  { code: '+592', label: 'Guyana' },
  { code: '+509', label: 'Haiti' },
  { code: '+504', label: 'Honduras' },
  { code: '+852', label: 'Hong Kong' },
  { code: '+36', label: 'Hungary' },
  { code: '+354', label: 'Iceland' },
  { code: '+91', label: 'India' },
  { code: '+62', label: 'Indonesia' },
  { code: '+98', label: 'Iran' },
  { code: '+964', label: 'Iraq' },
  { code: '+353', label: 'Ireland' },
  { code: '+44', label: 'Isle of Man' },
  { code: '+972', label: 'Israel' },
  { code: '+39', label: 'Italy' },
  { code: '+1876', label: 'Jamaica' },
  { code: '+81', label: 'Japan' },
  { code: '+44', label: 'Jersey' },
  { code: '+962', label: 'Jordan' },
  { code: '+7', label: 'Kazakhstan' },
  { code: '+254', label: 'Kenya' },
  { code: '+686', label: 'Kiribati' },
  { code: '+850', label: 'North Korea' },
  { code: '+82', label: 'South Korea' },
  { code: '+965', label: 'Kuwait' },
  { code: '+996', label: 'Kyrgyzstan' },
  { code: '+856', label: 'Laos' },
  { code: '+371', label: 'Latvia' },
  { code: '+961', label: 'Lebanon' },
  { code: '+266', label: 'Lesotho' },
  { code: '+231', label: 'Liberia' },
  { code: '+218', label: 'Libya' },
  { code: '+423', label: 'Liechtenstein' },
  { code: '+370', label: 'Lithuania' },
  { code: '+352', label: 'Luxembourg' },
  { code: '+853', label: 'Macau' },
  { code: '+389', label: 'Macedonia' },
  { code: '+261', label: 'Madagascar' },
  { code: '+265', label: 'Malawi' },
  { code: '+60', label: 'Malaysia' },
  { code: '+960', label: 'Maldives' },
  { code: '+223', label: 'Mali' },
  { code: '+356', label: 'Malta' },
  { code: '+692', label: 'Marshall Islands' },
  { code: '+596', label: 'Martinique' },
  { code: '+222', label: 'Mauritania' },
  { code: '+230', label: 'Mauritius' },
  { code: '+262', label: 'Mayotte' },
  { code: '+52', label: 'Mexico' },
  { code: '+691', label: 'Micronesia' },
  { code: '+373', label: 'Moldova' },
  { code: '+377', label: 'Monaco' },
  { code: '+976', label: 'Mongolia' },
  { code: '+382', label: 'Montenegro' },
  { code: '+1664', label: 'Montserrat' },
  { code: '+212', label: 'Morocco' },
  { code: '+258', label: 'Mozambique' },
  { code: '+95', label: 'Myanmar' },
  { code: '+264', label: 'Namibia' },
  { code: '+674', label: 'Nauru' },
  { code: '+977', label: 'Nepal' },
  { code: '+31', label: 'Netherlands' },
  { code: '+687', label: 'New Caledonia' },
  { code: '+64', label: 'New Zealand' },
  { code: '+505', label: 'Nicaragua' },
  { code: '+227', label: 'Niger' },
  { code: '+234', label: 'Nigeria' },
  { code: '+683', label: 'Niue' },
  { code: '+672', label: 'Norfolk Island' },
  { code: '+47', label: 'Norway' },
  { code: '+968', label: 'Oman' },
  { code: '+92', label: 'Pakistan' },
  { code: '+680', label: 'Palau' },
  { code: '+970', label: 'Palestine' },
  { code: '+507', label: 'Panama' },
  { code: '+675', label: 'Papua New Guinea' },
  { code: '+595', label: 'Paraguay' },
  { code: '+51', label: 'Peru' },
  { code: '+63', label: 'Philippines' },
  { code: '+48', label: 'Poland' },
  { code: '+351', label: 'Portugal' },
  { code: '+1787', label: 'Puerto Rico' },
  { code: '+974', label: 'Qatar' },
  { code: '+262', label: 'Reunion' },
  { code: '+40', label: 'Romania' },
  { code: '+7', label: 'Russia' },
  { code: '+250', label: 'Rwanda' },
  { code: '+685', label: 'Samoa' },
  { code: '+378', label: 'San Marino' },
  { code: '+239', label: 'Sao Tome and Principe' },
  { code: '+966', label: 'Saudi Arabia' },
  { code: '+221', label: 'Senegal' },
  { code: '+381', label: 'Serbia' },
  { code: '+248', label: 'Seychelles' },
  { code: '+232', label: 'Sierra Leone' },
  { code: '+65', label: 'Singapore' },
  { code: '+421', label: 'Slovakia' },
  { code: '+386', label: 'Slovenia' },
  { code: '+677', label: 'Solomon Islands' },
  { code: '+252', label: 'Somalia' },
  { code: '+27', label: 'South Africa' },
  { code: '+34', label: 'Spain' },
  { code: '+94', label: 'Sri Lanka' },
  { code: '+249', label: 'Sudan' },
  { code: '+597', label: 'Suriname' },
  { code: '+47', label: 'Svalbard and Jan Mayen' },
  { code: '+268', label: 'Swaziland' },
  { code: '+46', label: 'Sweden' },
  { code: '+41', label: 'Switzerland' },
  { code: '+963', label: 'Syria' },
  { code: '+886', label: 'Taiwan' },
  { code: '+992', label: 'Tajikistan' },
  { code: '+255', label: 'Tanzania' },
  { code: '+66', label: 'Thailand' },
  { code: '+670', label: 'Timor-Leste' },
  { code: '+228', label: 'Togo' },
  { code: '+690', label: 'Tokelau' },
  { code: '+676', label: 'Tonga' },
  { code: '+1868', label: 'Trinidad and Tobago' },
  { code: '+216', label: 'Tunisia' },
  { code: '+90', label: 'Turkey' },
  { code: '+993', label: 'Turkmenistan' },
  { code: '+1649', label: 'Turks and Caicos Islands' },
  { code: '+688', label: 'Tuvalu' },
  { code: '+256', label: 'Uganda' },
  { code: '+380', label: 'Ukraine' },
  { code: '+971', label: 'United Arab Emirates' },
  { code: '+44', label: 'United Kingdom' },
  { code: '+1', label: 'United States' },
  { code: '+598', label: 'Uruguay' },
  { code: '+998', label: 'Uzbekistan' },
  { code: '+678', label: 'Vanuatu' },
  { code: '+58', label: 'Venezuela' },
  { code: '+84', label: 'Vietnam' },
  { code: '+681', label: 'Wallis and Futuna' },
  { code: '+967', label: 'Yemen' },
  { code: '+260', label: 'Zambia' },
  { code: '+263', label: 'Zimbabwe' },
];

// Convert country codes to react-select options format
const countryOptions = countryCodes.map(country => ({
  value: country.code,
  label: `${country.code} (${country.label})`
}));

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signUp(email, password, {
        data: {
          name: name,
          mobile: selectedCountry.value + mobile,
        },
      });
      toast.success('Account created! Please check your email to verify.');
      navigate('/login');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Join our community
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <label
                  htmlFor="name"
                  className="absolute left-0 -top-2.5 px-2 bg-white text-gray-700 text-sm transition-all"
                >
                  Full Name
                </label>
              </div>
            </div>

            <div>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Email address"
                />
                <label
                  htmlFor="email"
                  className="absolute left-0 -top-2.5 px-2 bg-white text-gray-700 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-2 peer-focus:-top-2.5 peer-focus:text-gray-700"
                >
                  Email address
                </label>
              </div>
            </div>

            {/* Mobile Number with Country Code */}
            <div className="space-y-4">
              <div className="relative z-30"> {/* Increase z-index here */}
                <Select
                  inputId="country"
                  value={selectedCountry}
                  onChange={(option) => setSelectedCountry(option)}
                  options={countryOptions}
                  isSearchable={true}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '38px',
                      height: '38px',
                      backgroundColor: 'white',
                      borderColor: '#D1D5DB',
                      '&:hover': {
                        borderColor: '#9CA3AF'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 50, // Make sure this is higher than the label's z-index
                      backgroundColor: 'white',
                      border: '1px solid #D1D5DB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }),
                    menuList: (base) => ({
                      ...base,
                      maxHeight: '200px',
                      backgroundColor: 'white',
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#F3F4F6'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#9CA3AF',
                        borderRadius: '4px'
                      }
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isFocused ? '#EEF2FF' : 'white',
                      color: '#111827',
                      '&:hover': {
                        backgroundColor: '#EEF2FF'
                      }
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: '#9CA3AF'
                    })
                  }}
                  placeholder="Select country code"
                />
                <label
                  htmlFor="country"
                  className="absolute -top-2.5 left-2 px-2 bg-white text-gray-700 text-sm z-10"
                >
                  Country Code
                </label>
              </div>

              {/* Mobile Number Input */}
              <div className="relative">
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <label
                  htmlFor="mobile"
                  className="absolute left-0 -top-2.5 px-2 bg-white text-gray-700 text-sm transition-all"
                >
                  Mobile Number
                </label>
              </div>
            </div>

            <div>
              {/* Password Input */}
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <label
                  htmlFor="password"
                  className="absolute left-0 -top-2.5 px-2 bg-white text-gray-700 text-sm transition-all"
                >
                  Password
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-150"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}