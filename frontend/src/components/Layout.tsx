import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

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
      <AppBar position="static" sx={{ backgroundColor: "#1976d2" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ✨ Slay Drip
          </Typography>
        </Toolbar>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab === -1 ? 0 : currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              "& .MuiTab-root": {
                color: "rgba(255, 255, 255, 0.7)",
                "&.Mui-selected": {
                  color: "white",
                },
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab key={tab.path} label={tab.label} />
            ))}
          </Tabs>
        </Box>
      </AppBar>
      <Container sx={{ mt: 4, pb: 4 }}>{children}</Container>
    </>
  );
};

export default Layout;
