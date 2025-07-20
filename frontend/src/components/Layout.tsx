import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const tabs = [
    { label: "Wardrobe", path: "/" },
    { label: "Upload", path: "/upload" },
    { label: "Create Outfit", path: "/create-outfit" },
    { label: "My Outfits", path: "/outfits" },
  ];

  const currentTab = tabs.findIndex(tab => tab.path === location.pathname);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    navigate(tabs[newValue].path);
  };

  return (
    <>
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: "#1976d2",
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            sx={{ 
              flexGrow: 1,
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}
          >
            ✨ Slay Drip
          </Typography>
        </Toolbar>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab === -1 ? 0 : currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              "& .MuiTab-root": {
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: isMobile ? "0.8rem" : "0.875rem",
                minWidth: isMobile ? 80 : 120,
                "&.Mui-selected": {
                  color: "white",
                  fontWeight: 600,
                },
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "2px 2px 0 0",
              }
            }}
          >
            {tabs.map((tab) => (
              <Tab key={tab.path} label={tab.label} />
            ))}
          </Tabs>
        </Box>
      </AppBar>
      <Container 
        maxWidth="xl"
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 }, 
          pb: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        {children}
      </Container>
    </>
  );
};

export default Layout;
