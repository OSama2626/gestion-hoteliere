import React from 'react';
import { Container, Paper, Box } from '@mui/material';

const PageContainer = ({ children, maxWidth = 'lg', sx = {} }) => {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 4, ...sx }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: 'background.paper',
          minHeight: '60vh',
        }}
      >
        <Box sx={{ height: '100%' }}>{children}</Box>
      </Paper>
    </Container>
  );
};

export default PageContainer; 