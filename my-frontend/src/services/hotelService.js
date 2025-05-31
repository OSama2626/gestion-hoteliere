// Mock API delay
const MOCK_API_DELAY = 500;

// Mock hotel database
const mockHotels = [
  {
    id: '1',
    name: 'Grand Plaza Hotel',
    address: '123 Main St',
    city: 'Metropolis',
    category: '5 stars',
    rooms: [
      { type: 'Simple', price: { standard: 100, peak: 150 }, available: 10 },
      { type: 'Double', price: { standard: 180, peak: 250 }, available: 5 },
      { type: 'Suite', price: { standard: 300, peak: 450 }, available: 2 }
    ],
    images: ['/placeholder-hotel-1.jpg', '/placeholder-hotel-2.jpg'] // Example image paths
  },
  {
    id: '2',
    name: 'Comfort Inn Downtown',
    address: '456 Central Ave',
    city: 'Metropolis',
    category: '4 stars',
    rooms: [
      { type: 'Simple', price: { standard: 80, peak: 120 }, available: 15 },
      { type: 'Double Confort', price: { standard: 150, peak: 200 }, available: 8 }
    ],
    images: ['/placeholder-hotel-3.jpg']
  },
  {
    id: '3',
    name: 'Seaside Resort',
    address: '789 Ocean Drive',
    city: 'Beach City',
    category: '4 stars',
    rooms: [
      { type: 'Double', price: { standard: 200, peak: 280 }, available: 10 },
      { type: 'Suite', price: { standard: 350, peak: 500 }, available: 5 }
    ],
    images: [] // No images for this one, will use default
  }
];

// Function to determine current season (mock)
const getCurrentSeason = () => {
  // This could be dynamic based on date, e.g. Christmas, Summer
  // For now, let's randomly switch for testing or keep it simple
  // return Math.random() > 0.5 ? 'peak' : 'standard';
  return 'standard'; // or 'peak'
};

export const getHotels = async (filters = {}) => {
  console.log('hotelService.getHotels called with filters:', filters);
  return new Promise((resolve) => {
    setTimeout(() => {
      // Basic filtering example (can be expanded)
      let filteredHotels = mockHotels;
      if (filters.city && filters.city.trim() !== '') {
        console.log(`Filtering by city: "${filters.city}"`);
        filteredHotels = filteredHotels.filter(h => h.city.toLowerCase().includes(filters.city.toLowerCase()));
      }
      // Add more filters for dates, room type later
      const results = filteredHotels.map(hotel => ({ // Return summary
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          category: hotel.category,
          // Display a starting price based on current season for the cheapest room
          startingPrice: hotel.rooms.length > 0 ? Math.min(...hotel.rooms.map(r => r.price[getCurrentSeason()])) : 0,
          thumbnail: hotel.images && hotel.images.length > 0 ? hotel.images[0] : '/default-hotel.png'
      }));
      console.log('hotelService.getHotels resolving with:', results);
      resolve(results);
    }, MOCK_API_DELAY);
  });
};

export const getHotelById = async (id) => {
  console.log('hotelService.getHotelById called with id:', id);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const hotel = mockHotels.find(h => h.id === id);
      if (hotel) {
        // Add dynamic pricing based on season to each room for detail view
        const season = getCurrentSeason();
        const hotelWithDynamicPrices = {
            ...hotel,
            rooms: hotel.rooms.map(room => ({
                ...room,
                currentPrice: room.price[season]
            }))
        };
        console.log('hotelService.getHotelById resolving with:', hotelWithDynamicPrices);
        resolve(hotelWithDynamicPrices);
      } else {
        console.log('hotelService.getHotelById rejecting - Hotel not found');
        reject({ message: 'Hotel not found' });
      }
    }, MOCK_API_DELAY);
  });
};
