import React from 'react';
import { Paper, Box } from '@mui/material';

const FormContainer = ({ children, maxWidth = 'sm', sx = {} }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
        py: 4,
        ...sx,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: maxWidth,
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default FormContainer; 