import React from 'react';
import { Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const PageHeader = ({ title, breadcrumbs = [], actions }) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 2 }}>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={crumb.path} color="text.primary">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                component={RouterLink}
                to={crumb.path}
                color="inherit"
                sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom={!actions}>
          {title}
        </Typography>
        {actions && <Box>{actions}</Box>}
      </Box>
    </Box>
  );
};

export default PageHeader; 