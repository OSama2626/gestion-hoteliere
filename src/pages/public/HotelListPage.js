```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHotels } from '../../services/hotelService'; // Adjust path as needed

const HotelListPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const params = {};
        if (cityFilter) {
          params.city = cityFilter;
        }
        const data = await getHotels(params);
        setHotels(data);
      } catch (err) {
        setError('Failed to fetch hotels.');
        console.error(err);
      }
      setLoading(false);
    };
    fetchHotels();
  }, [cityFilter]); // Re-fetch when cityFilter changes

  const handleSearch = (e) => {
    e.preventDefault();
    // The actual search/filtering is triggered by the useEffect hook when cityFilter changes.
    // This function can be used for more complex search logic if needed in the future.
    console.log(`Searching for hotels in city: ${cityFilter}`);
  };

  if (loading) return <p>Loading hotels...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>Available Hotels</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
        />
        {/* <button type="submit">Search</button> */ /* Button removed as search is live with typing */ }
      </form>

      {hotels.length === 0 && !loading && <p>No hotels found matching your criteria.</p>}

      <div className="hotel-list" style={{ marginTop: '20px' }}>
        {hotels.map(hotel => (
          <div key={hotel.id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
            <img src={hotel.thumbnail} alt={hotel.name} style={{width: '100px', height: 'auto', marginRight: '10px', float: 'left'}} />
            <div style={{ overflow: 'hidden'}}>
              <h2><Link to={`/hotel/${hotel.id}`}>{hotel.name}</Link></h2>
              <p>City: {hotel.city}</p>
              <p>Category: {hotel.category}</p>
              <p>Starting from: ${hotel.startingPrice} / night</p>
            </div>
            <div style={{clear: 'both'}}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelListPage;
```
