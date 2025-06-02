```javascript
import React from 'react';

const Footer = () => {
  return (
    <footer style={{ textAlign: 'center', padding: '20px', marginTop: '40px', borderTop: '1px solid #eee' }}>
      <p>&copy; {new Date().getFullYear()} Hotel Booking System. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
```
