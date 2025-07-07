import React from "react";
import { AppBar, Toolbar, Typography, Container } from "@mui/material";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Slay Drip</Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>{children}</Container>
    </>
  );
};

export default Layout;
