import type { Speaker } from '@/modules/partnership-events/domain/types';

export const ALL_COUNTRIES = ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (Congo-Brazzaville)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine State', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'];

export const COUNTRIES = ['India'].concat(ALL_COUNTRIES.filter((c) => c !== 'India').sort((a, b) => a.localeCompare(b)));

export const CITY_DATA: Record<string, string[]> = {
  'India': ['Bengaluru', 'Mumbai', 'Delhi', 'Gurugram', 'Noida', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Kochi', 'Indore', 'Lucknow', 'Surat', 'Bhopal', 'Nagpur', 'Coimbatore'],
  'United States': ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Boston', 'Washington D.C.', 'Miami', 'Denver', 'Atlanta', 'Dallas', 'Houston', 'Philadelphia', 'San Diego', 'Portland', 'Phoenix', 'Las Vegas'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol', 'Leeds', 'Liverpool', 'Cambridge', 'Oxford', 'Sheffield', 'Belfast', 'Cardiff', 'Newcastle', 'Nottingham', 'Reading'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain', 'Khor Fakkan', 'Jebel Ali', 'Dubai Marina', 'Downtown Dubai', 'Business Bay', 'Dubai Silicon Oasis', 'Dibba Al-Hisn'],
  'Singapore': ['Downtown Core', 'Jurong East', 'Tampines', 'Woodlands', 'Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Bedok', 'Clementi', 'Punggol', 'Sengkang', 'Yishun', 'Hougang', 'Serangoon', 'Pasir Ris', 'Bukit Batok', 'Choa Chu Kang'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast', 'Newcastle', 'Wollongong', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Leipzig', 'Dresden', 'Hanover', 'Nuremberg', 'Bremen', 'Essen', 'Bonn', 'Mannheim'],
  'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Grenoble', 'Dijon', 'Angers'],
  'Japan': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Okayama', 'Nagasaki'],
  'China': ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Chengdu', 'Hangzhou', 'Wuhan', "Xi'an", 'Nanjing', 'Chongqing', 'Tianjin', 'Suzhou', 'Qingdao', 'Dalian', 'Xiamen', 'Zhuhai'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'Victoria', 'Halifax', 'London', 'Saskatoon', 'Regina', 'Waterloo'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Haarlem', 'Arnhem', 'Enschede', 'Amersfoort', 'Zwolle', 'Leiden'],
  'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa', 'Beer Sheva', 'Herzliya', 'Netanya', 'Rishon LeZion', 'Ramat Gan', 'Petah Tikva', 'Eilat', 'Ashdod', 'Ashkelon', 'Rehovot', 'Kfar Saba', 'Raanana', 'Holon'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Recife', 'Florianópolis', 'Campinas', 'Goiânia', 'Manaus', 'Belém', 'Vitória', 'Natal'],
  'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Querétaro', 'Mérida', 'Cancún', 'San Luis Potosí', 'Toluca', 'Aguascalientes', 'Chihuahua', 'Culiacán', 'Hermosillo', 'Saltillo'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran', 'Taif', 'Tabuk', 'Abha', 'Jubail', 'Yanbu', 'Najran', 'Hail', 'Al Kharj', 'Buraidah'],
  'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Palembang', 'Yogyakarta', 'Denpasar', 'Bekasi', 'Tangerang', 'Depok', 'Bogor', 'Malang', 'Batam', 'Balikpapan'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Nelspruit', 'Polokwane', 'Kimberley', 'Pietermaritzburg', 'Rustenburg', 'George', 'Centurion', 'Sandton', 'Stellenbosch'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'San Sebastián'],
  'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania', 'Venice', 'Verona', 'Padua', 'Trieste', 'Brescia', 'Parma'],
  'Russia': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don', 'Ufa', 'Krasnoyarsk', 'Voronezh', 'Perm', 'Volgograd', 'Sochi'],
  'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan', 'Goyang', 'Yongin', 'Seongnam', 'Bucheon', 'Ansan', 'Jeonju', 'Cheongju', 'Jeju City'],
  'Pakistan': ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Sargodha', 'Bahawalpur', 'Sukkur', 'Larkana', 'Abbottabad'],
  'Bangladesh': ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Sylhet', 'Barisal', 'Rangpur', 'Comilla', 'Mymensingh', 'Narayanganj', 'Gazipur', 'Jessore', 'Bogura', 'Dinajpur', "Cox's Bazar", 'Tangail'],
  'Sri Lanka': ['Colombo', 'Kandy', 'Galle', 'Jaffna', 'Negombo', 'Anuradhapura', 'Trincomalee', 'Batticaloa', 'Matara', 'Kurunegala', 'Ratnapura', 'Badulla', 'Nuwara Eliya', 'Polonnaruwa', 'Kalutara', 'Gampaha'],
  'Nepal': ['Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'Bharatpur', 'Birgunj', 'Dharan', 'Butwal', 'Hetauda', 'Janakpur', 'Nepalgunj', 'Itahari', 'Dhangadhi', 'Tulsipur', 'Bhaktapur', 'Damak'],
  'Malaysia': ['Kuala Lumpur', 'George Town', 'Johor Bahru', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Malacca City', 'Kota Kinabalu', 'Kuching', 'Seremban', 'Kuantan', 'Alor Setar', 'Miri', 'Sandakan', 'Sibu', 'Putrajaya'],
  'Philippines': ['Manila', 'Quezon City', 'Cebu City', 'Davao City', 'Makati', 'Taguig', 'Pasig', 'Baguio', 'Iloilo City', 'Cagayan de Oro', 'Zamboanga City', 'Bacolod', 'General Santos', 'Angeles City', 'Batangas City', 'Antipolo'],
  'Thailand': ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket', 'Nonthaburi', 'Nakhon Ratchasima', 'Khon Kaen', 'Udon Thani', 'Hat Yai', 'Rayong', 'Ayutthaya', 'Chiang Rai', 'Surat Thani', 'Nakhon Pathom', 'Ubon Ratchathani', 'Pak Kret'],
  'Vietnam': ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Can Tho', 'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Vung Tau', 'Quy Nhon', 'Thai Nguyen', 'Thanh Hoa', 'Vinh', 'Rach Gia', 'Da Lat'],
  'Nigeria': ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt', 'Benin City', 'Kaduna', 'Enugu', 'Aba', 'Onitsha', 'Warri', 'Jos', 'Ilorin', 'Owerri', 'Calabar', 'Uyo'],
  'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Kitale', 'Garissa', 'Kakamega', 'Nyeri', 'Machakos', 'Meru', 'Naivasha', 'Kericho', 'Kisii'],
  'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Shubra El-Kheima', 'Port Said', 'Suez', 'Luxor', 'Aswan', 'Mansoura', 'Tanta', 'Asyut', 'Ismailia', 'Faiyum', 'Zagazig', 'Damietta', 'Hurghada'],
  'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep', 'Mersin', 'Kayseri', 'Eskişehir', 'Diyarbakır', 'Samsun', 'Denizli', 'Şanlıurfa', 'Trabzon'],
  'Poland': ['Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Katowice', 'Białystok', 'Gdynia', 'Częstochowa', 'Radom', 'Toruń', 'Kielce'],
  'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Gävle', 'Borås', 'Södertälje', 'Eskilstuna'],
  'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Bern', 'Lausanne', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel/Bienne', 'Thun', 'Köniz', 'La Chaux-de-Fonds', 'Fribourg', 'Schaffhausen', 'Vernier'],
  'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Napier-Hastings', 'Dunedin', 'Palmerston North', 'Nelson', 'Rotorua', 'New Plymouth', 'Whangarei', 'Invercargill', 'Wanaka', 'Queenstown', 'Gisborne'],
  'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Dundalk', 'Swords', 'Bray', 'Navan', 'Kilkenny', 'Ennis', 'Carlow', 'Tralee', 'Newbridge', 'Athlone'],
  'Portugal': ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Funchal', 'Setúbal', 'Aveiro', 'Faro', 'Évora', 'Viseu', 'Guimarães', 'Leiria', 'Viana do Castelo', 'Vila Real', 'Beja', 'Portimão'],
  'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'San Miguel de Tucumán', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Neuquén', 'Corrientes', 'Bahía Blanca', 'Posadas', 'Paraná'],
  'Chile': ['Santiago', 'Valparaíso', 'Concepción', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Iquique', 'Puerto Montt', 'Chillán', 'Valdivia', 'Punta Arenas', 'Copiapó', 'Osorno'],
  'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Cúcuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Ibagué', 'Manizales', 'Villavicencio', 'Neiva', 'Armenia', 'Popayán', 'Valledupar'],
  'Qatar': ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Umm Salal', 'Al Daayen', 'Lusail', 'Mesaieed', 'Dukhan', 'Al Shamal', 'Al Ruwais', 'Simaisma', 'Abu Samra', 'Al Wukair', 'Education City', 'West Bay'],
};

export const OTHER_CITY_VALUE = '__other__';

export interface ImageSpec {
  width: number;
  height: number;
}

export const IMAGE_SPECS: Record<string, ImageSpec> = {
  cover: { width: 1260, height: 630 },
  banner: { width: 2438, height: 413 },
  social: { width: 1080, height: 1440 },
};

export const SOCIAL_PLATFORMS = [
  { slot: 1, key: 'instagram', label: 'Instagram', emoji: '📸' },
  { slot: 2, key: 'facebook', label: 'Facebook', emoji: '📘' },
  { slot: 3, key: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { slot: 4, key: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
] as const;

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png'];
export const ALLOWED_IMAGE_EXT_RE = /\.(jpe?g|png)([?#].*)?$/i;

export interface PhoneRule {
  pattern: RegExp;
  message: string;
  /** Longest number of digits this country's rule allows — used to cap keystrokes/paste as the user types. */
  maxLen: number;
}

export const PHONE_RULES: Record<string, PhoneRule> = {
  '+91': { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit Indian mobile number starting with 6-9.', maxLen: 10 },
  '+1': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit US/Canada phone number.', maxLen: 10 },
  '+44': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit UK phone number.', maxLen: 11 },
  '+971': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit UAE phone number.', maxLen: 9 },
  '+65': { pattern: /^\d{8}$/, message: 'Enter a valid 8-digit Singapore phone number.', maxLen: 8 },
  '+61': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Australian phone number.', maxLen: 9 },
  '+49': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit German phone number.', maxLen: 11 },
  '+33': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit French phone number.', maxLen: 9 },
  '+81': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Japanese phone number.', maxLen: 10 },
  '+86': { pattern: /^\d{11}$/, message: 'Enter a valid 11-digit Chinese phone number.', maxLen: 11 },
  '+7': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Russian phone number.', maxLen: 10 },
  '+55': { pattern: /^\d{10,11}$/, message: 'Enter a valid 10-11 digit Brazilian phone number.', maxLen: 11 },
  '+27': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit South African phone number.', maxLen: 9 },
  '+92': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Pakistani phone number.', maxLen: 10 },
  '+880': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Bangladeshi phone number.', maxLen: 10 },
  '+94': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Sri Lankan phone number.', maxLen: 9 },
  '+977': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Nepali phone number.', maxLen: 10 },
  '+60': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Malaysian phone number.', maxLen: 10 },
  '+62': { pattern: /^\d{9,12}$/, message: 'Enter a valid 9-12 digit Indonesian phone number.', maxLen: 12 },
  '+63': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Philippine phone number.', maxLen: 10 },
  '+66': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Thai phone number.', maxLen: 9 },
  '+82': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit South Korean phone number.', maxLen: 10 },
  '+39': { pattern: /^\d{9,10}$/, message: 'Enter a valid 9-10 digit Italian phone number.', maxLen: 10 },
  '+34': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Spanish phone number.', maxLen: 9 },
  '+31': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Dutch phone number.', maxLen: 9 },
  '+52': { pattern: /^\d{10}$/, message: 'Enter a valid 10-digit Mexican phone number.', maxLen: 10 },
  '+966': { pattern: /^\d{9}$/, message: 'Enter a valid 9-digit Saudi Arabian phone number.', maxLen: 9 },
  '+64': { pattern: /^\d{8,9}$/, message: 'Enter a valid 8-9 digit New Zealand phone number.', maxLen: 9 },
  other: { pattern: /^\d{6,15}$/, message: 'Enter a valid phone number (6-15 digits).', maxLen: 15 },
};

export interface CountryCodeOption {
  code: string;
  iso: string;
  emoji: string;
}

export const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: '+91', iso: 'in', emoji: '🇮🇳' },
  { code: '+1', iso: 'us', emoji: '🇺🇸' },
  { code: '+44', iso: 'gb', emoji: '🇬🇧' },
  { code: '+971', iso: 'ae', emoji: '🇦🇪' },
  { code: '+65', iso: 'sg', emoji: '🇸🇬' },
  { code: '+61', iso: 'au', emoji: '🇦🇺' },
  { code: '+49', iso: 'de', emoji: '🇩🇪' },
  { code: '+33', iso: 'fr', emoji: '🇫🇷' },
  { code: '+81', iso: 'jp', emoji: '🇯🇵' },
  { code: '+86', iso: 'cn', emoji: '🇨🇳' },
  { code: '+7', iso: 'ru', emoji: '🇷🇺' },
  { code: '+55', iso: 'br', emoji: '🇧🇷' },
  { code: '+27', iso: 'za', emoji: '🇿🇦' },
  { code: '+92', iso: 'pk', emoji: '🇵🇰' },
  { code: '+880', iso: 'bd', emoji: '🇧🇩' },
  { code: '+94', iso: 'lk', emoji: '🇱🇰' },
  { code: '+977', iso: 'np', emoji: '🇳🇵' },
  { code: '+60', iso: 'my', emoji: '🇲🇾' },
  { code: '+62', iso: 'id', emoji: '🇮🇩' },
  { code: '+63', iso: 'ph', emoji: '🇵🇭' },
  { code: '+66', iso: 'th', emoji: '🇹🇭' },
  { code: '+82', iso: 'kr', emoji: '🇰🇷' },
  { code: '+39', iso: 'it', emoji: '🇮🇹' },
  { code: '+34', iso: 'es', emoji: '🇪🇸' },
  { code: '+31', iso: 'nl', emoji: '🇳🇱' },
  { code: '+52', iso: 'mx', emoji: '🇲🇽' },
  { code: '+966', iso: 'sa', emoji: '🇸🇦' },
  { code: '+64', iso: 'nz', emoji: '🇳🇿' },
  { code: 'other', iso: '', emoji: '🌐' },
];

export const CUSTOM_CODE_RE = /^\+\d{1,4}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DESC_TARGET_WORDS = 400;

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function emptySpeaker(): Speaker {
  return { name: '', designation: '', company: '', others: '' };
}
