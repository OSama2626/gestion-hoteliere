import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHotels } from '../../services/hotelService'; // Adjust path as needed

const HotelListPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Placeholder for search filters
  const [cityFilter, setCityFilter] = useState('');
  // const [dateFilter, setDateFilter] = useState(''); // For later
  // const [roomTypeFilter, setRoomTypeFilter] = useState(''); // For later

  useEffect(() => {
    const fetchHotels = async () => {
      console.log('HotelListPage: useEffect triggered to fetch hotels.');
      setLoading(true);
      setError(''); // Reset error before new fetch
      try {
        const params = {};
        if (cityFilter.trim() !== '') { // Only add city filter if it's not empty
          params.city = cityFilter;
        }
        console.log('HotelListPage: Calling getHotels with params:', params);
        const data = await getHotels(params);
        setHotels(data);
        console.log('HotelListPage: Hotels data received:', data);
      } catch (err) {
        setError('Failed to fetch hotels.');
        console.error('HotelListPage: Error fetching hotels:', err);
      }
      setLoading(false);
    };
    fetchHotels();
  }, [cityFilter]); // Refetch when cityFilter changes

  const handleFilterChange = (e) => {
    // This will directly trigger the useEffect to refetch hotels
    setCityFilter(e.target.value);
  };

  // Optional: A submit handler if you prefer a search button click to trigger fetch
  // const handleSearchSubmit = (e) => {
  //   e.preventDefault();
  //   // useEffect will run due to cityFilter state change, but if you wanted an explicit call:
  //   // fetchHotels(); // You'd need to define fetchHotels outside useEffect or pass cityFilter
  //   console.log('HotelListPage: Search submitted with city:', cityFilter);
  // };


  if (loading) return <p>Loading hotels...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>Available Hotels</h1>
      {/* Placeholder Search/Filter Form */}
      <form onSubmit={(e) => e.preventDefault()}> {/* Prevent default form submission if using a button type submit */}
        <input
          type="text"
          placeholder="Search by city..."
          value={cityFilter}
          onChange={handleFilterChange} // Update filter as user types
        />
        {/*
        <button type="submit">Search</button>
        // Search button is optional if filtering happens on input change
        */}
      </form>

      {hotels.length === 0 && !loading && <p>No hotels found matching your criteria.</p>}

      <div className="hotel-list" style={{ marginTop: '20px' }}>
        {hotels.map(hotel => (
          <div key={hotel.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
            <img src={hotel.thumbnail} alt={hotel.name} style={{width: '100px', height: 'auto', marginRight: '10px', float: 'left'}} />
            <div style={{ overflow: 'hidden'}}> {/* Container for text content to prevent wrap issues with float */}
              <h2><Link to={`/hotels/${hotel.id}`}>{hotel.name}</Link></h2>
              <p>City: {hotel.city}</p>
              <p>Category: {hotel.category}</p>
              <p>Starting from: ${hotel.startingPrice} / night</p>
            </div>
            <div style={{clear: 'both'}}></div> {/* Clear float */}
          </div>
        ))}
      </div>
    </div>
  );
};
export default HotelListPage;
