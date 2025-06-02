import React from 'react';

const Input = ({ type = 'text', id, value, onChange, label, required = false, ...props }) => {
  return (
    <div>
      {label && <label htmlFor={id}>{label}:</label>}
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      />
    </div>
  );
};

export default Input;
