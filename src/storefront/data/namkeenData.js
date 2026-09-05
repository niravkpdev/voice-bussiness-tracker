// Comprehensive namkeen and snack catalog data modeled from Bhole G Namkeen (modification.mp4)

export const CATEGORIES = [
  { id: 'all', name: 'All', count: 48, icon: '🥨' },
  { id: 'dana', name: 'Dana', count: 8, image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop&q=80' },
  { id: 'chana', name: 'Chana', count: 12, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80' },
  { id: 'wafer', name: 'Wafer', count: 8, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80' },
  { id: 'soya-sticks', name: 'Soya Sticks', count: 7, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80' },
  { id: 'vatana', name: 'Vatana', count: 4, image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=300&auto=format&fit=crop&q=80' },
  { id: 'kathor', name: 'Kathor', count: 8, image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=300&auto=format&fit=crop&q=80' },
  { id: 'gathiya', name: 'Gathiya', count: 11, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=80' },
  { id: 'bhakarwadi', name: 'Bhakarwadi', count: 6, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&auto=format&fit=crop&q=80' },
  { id: 'sev', name: 'Sev', count: 8, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80' },
  { id: 'mix-namkeen', name: 'Mix Namkeen', count: 13, image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop&q=80' },
  { id: 'chewda', name: 'Chewda', count: 7, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80' },
  { id: 'puri', name: 'Puri', count: 5, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=80' },
  { id: 'chikki', name: 'Chikki', count: 6, image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=300&auto=format&fit=crop&q=80' },
  { id: 'bundi', name: 'Bundi', count: 4, image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=300&auto=format&fit=crop&q=80' },
  { id: 'khakhra', name: 'Khakhra', count: 8, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80' },
  { id: 'sticks', name: 'Sticks', count: 5, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80' },
  { id: 'frymes', name: 'Frymes', count: 6, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80' }
];

export const PRODUCTS = [
  // Best Sellers & Featured
  {
    id: 'prod-special-combo',
    name: 'Bhole G Special Combo - 8 Taste Pack',
    category: 'mix-namkeen',
    categoryLabel: 'Best Combo',
    description: 'Our signature combination pack featuring 8 distinct handcrafted authentic Gujarati snacks in one family bundle.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 5.0,
    reviewsCount: 142,
    variants: [
      { weight: '800 GM', price: 400.00, inStock: true },
      { weight: '1 KG', price: 499.00, inStock: true }
    ]
  },
  {
    id: 'prod-moong-jor',
    name: 'Moong Jor Salted',
    category: 'kathor',
    categoryLabel: 'Kathor',
    description: 'Crispy roasted whole moong beans lightly dusted with Himalayan rock salt. High protein and crunchy.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 88,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true },
      { weight: '1 KG', price: 440.00, inStock: true }
    ]
  },
  {
    id: 'prod-lausan-mix',
    name: 'Special Lausan Mix',
    category: 'mix-namkeen',
    categoryLabel: 'Mix Namkeen',
    description: 'Crunchy spicy farsan blend infused with roasted fresh garlic cloves and traditional aromatic spices.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 95,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-methi-gathiya',
    name: 'Methi Gathiya',
    category: 'gathiya',
    categoryLabel: 'Gathiya',
    description: 'Soft, melt-in-mouth chickpea flour snack seasoned with fragrant fenugreek leaves (methi) and whole black pepper.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 76,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-fulvadi',
    name: 'Special Gujarati Fulvadi',
    category: 'sticks',
    categoryLabel: 'Sticks',
    description: 'Crisp deep-fried savory cylinders of coarse besan seasoned with cracked coriander seeds, sesame, and black pepper.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 110,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },

  // "NJ" Not For Jain Curated Collection (Potatoes, Onion, Garlic)
  {
    id: 'prod-potato-wafers',
    name: 'Potato Salted Wafers',
    category: 'wafer',
    categoryLabel: 'Wafer',
    description: 'Ultra-thin, paper-crisp potato chips fried in fresh pure groundnut oil and seasoned with rock salt.',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 64,
    variants: [
      { weight: '100 GM', price: 60.00, inStock: true },
      { weight: '250 GM', price: 100.00, inStock: true },
      { weight: '500 GM', price: 190.00, inStock: true }
    ]
  },
  {
    id: 'prod-potato-papdi-wafer',
    name: 'Potato Papdi Wafer',
    category: 'wafer',
    categoryLabel: 'Wafer',
    description: 'Crispy ribbed potato papdi crackers seasoned with a light tangy spice blend.',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.7,
    reviewsCount: 39,
    variants: [
      { weight: '100 GM', price: 60.00, inStock: true },
      { weight: '250 GM', price: 100.00, inStock: true }
    ]
  },
  {
    id: 'prod-soya-maggie-sticks',
    name: 'Soya Maggie Sticks',
    category: 'soya-sticks',
    categoryLabel: 'Soya Sticks',
    description: 'Crisp protein-rich soya sticks tossed in a zesty masala inspired by street-style Maggie noodles flavor.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 52,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-spicy-soya-szechuan',
    name: 'Spicy Soya Szechuan Sticks',
    category: 'soya-sticks',
    categoryLabel: 'Soya Sticks',
    description: 'Bold Indo-Chinese fusion snack with crushed chili, garlic, and fiery Szechuan spice glaze.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 47,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-lausan-gathiya',
    name: 'Lausan (Garlic) Gathiya',
    category: 'gathiya',
    categoryLabel: 'Gathiya',
    description: 'Signature spicy Gujarati gathiya heavily seasoned with pungent freshly ground Surat garlic cloves.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: true, // NJ
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 82,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },

  // New Arrivals & Categories
  {
    id: 'prod-gotado-mix',
    name: 'Surati Gotado Mix',
    category: 'mix-namkeen',
    categoryLabel: 'Mix Namkeen',
    description: 'Crunchy Surati gotado snack mix combining sweet, savory, and tangy notes in every mouthful.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.7,
    reviewsCount: 28,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-kumbhaniya-gathiya',
    name: 'Kumbhaniya Gathiya',
    category: 'gathiya',
    categoryLabel: 'Gathiya',
    description: 'Crisp airy gathiya with authentic Saurashtra spices, best paired with green chilies and hot tea.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 33,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-patra-gathiya',
    name: 'Patra Gathiya',
    category: 'gathiya',
    categoryLabel: 'Gathiya',
    description: 'Delicate leaf-shaped gathiya ribbons delicately flavored with ajwain and hing.',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 40,
    variants: [
      { weight: '250 GM', price: 130.00, inStock: true },
      { weight: '500 GM', price: 250.00, inStock: true }
    ]
  },
  {
    id: 'prod-cheese-ball',
    name: 'Cheese Ball Frymes',
    category: 'frymes',
    categoryLabel: 'Frymes',
    description: 'Light corn and rice balls covered in rich melted cheddar seasoning.',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: true, // Out of stock demonstrated in video
    rating: 4.6,
    reviewsCount: 22,
    variants: [
      { weight: '200 GM', price: 100.00, inStock: false }
    ]
  },
  {
    id: 'prod-vatka',
    name: 'Crispy Vatka Namkeen',
    category: 'frymes',
    categoryLabel: 'Frymes',
    description: 'Traditional hollow bowl frymes ready to munch or fill with chaat fillings.',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: true, // Out of stock
    rating: 4.5,
    reviewsCount: 15,
    variants: [
      { weight: '100 GM', price: 50.00, inStock: false }
    ]
  },

  // Chana & Dana
  {
    id: 'prod-salted-dana',
    name: 'Salted Sing Dana (Peanuts)',
    category: 'dana',
    categoryLabel: 'Dana',
    description: 'Premium jumbo Bharuchi peanuts roasted to golden perfection and tossed in sea salt.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 91,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-masala-shing-dana',
    name: 'Masala Shing Bhuja Dana',
    category: 'dana',
    categoryLabel: 'Dana',
    description: 'Crispy besan batter-coated spicy spiced peanuts with clove and cinnamon touch.',
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 84,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-chapti-chana-jor',
    name: 'Chapti Chana Jor Masala',
    category: 'chana',
    categoryLabel: 'Chana',
    description: 'Flattened black chickpeas seasoned with tangy amchur, black pepper, and chaat masala.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.9,
    reviewsCount: 114,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-haldi-chaat-chana',
    name: 'Haldi Chaat Chana',
    category: 'chana',
    categoryLabel: 'Chana',
    description: 'Mildly spiced roasted chickpeas coated in pure turmeric and rock salt.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: true, // Out of stock in video
    rating: 4.7,
    reviewsCount: 38,
    variants: [
      { weight: '250 GM', price: 100.00, inStock: false }
    ]
  },
  {
    id: 'prod-mora-chana',
    name: 'Mora Chana (Plain Roasted)',
    category: 'chana',
    categoryLabel: 'Chana',
    description: 'Classic unsalted crisp roasted Bengal gram for healthy everyday snacking.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.6,
    reviewsCount: 29,
    variants: [
      { weight: '250 GM', price: 100.00, inStock: true },
      { weight: '500 GM', price: 190.00, inStock: true }
    ]
  },

  // Bhakarwadi & Vatana
  {
    id: 'prod-bhakarwadi-special',
    name: 'Special Mini Bhakarwadi',
    category: 'bhakarwadi',
    categoryLabel: 'Bhakarwadi',
    description: 'Spiral rolls stuffed with a sweet, sour, and spicy blend of coconut, poppy seeds, and sesame.',
    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80',
    isTopSeller: true,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 5.0,
    reviewsCount: 167,
    variants: [
      { weight: '250 GM', price: 120.00, inStock: true },
      { weight: '500 GM', price: 230.00, inStock: true }
    ]
  },
  {
    id: 'prod-green-chutney-vatana',
    name: 'Green Chutney Vatana',
    category: 'vatana',
    categoryLabel: 'Vatana',
    description: 'Crunchy roasted green peas spiced with spicy mint, coriander, and lemon chutney seasoning.',
    image: 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=500&auto=format&fit=crop&q=80',
    isTopSeller: false,
    isNotForJain: false,
    isOutOfStock: false,
    rating: 4.8,
    reviewsCount: 51,
    variants: [
      { weight: '250 GM', price: 100.00, inStock: true },
      { weight: '500 GM', price: 190.00, inStock: true }
    ]
  }
];

export const STORE_INFO = {
  name: 'Bhole G Namkeen',
  tagline: 'namkeen & wafers',
  phone: '+91 9979668339',
  whatsapp: '919979668339',
  email: 'bholegnamkeen@gmail.com',
  instagram: '@bholegnamkeen',
  facebook: '@bholegnamkeen',
  address: 'Shop No 1 to 4, Hawda Sheri, Hira Bazar, Mahidharpura, Haripura, Surat, Gujarat 395003',
  hours: 'Open at 10:30 AM Every Day',
  fssaiNumber: '20723031002714',
  establishedYear: '2017',
  varietiesCount: '175+'
};
