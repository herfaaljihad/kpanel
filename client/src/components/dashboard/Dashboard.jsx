import {
  AccountCircle,
  AdminPanelSettings as AdminIcon,
  Backup as BackupIcon,
  Schedule as CronIcon,
  Dashboard as DashboardIcon,
  Storage as DatabaseIcon,
  Dns as DNSIcon,
  Domain as DomainIcon,
  Email as EmailIcon,
  FolderSpecial as FTPIcon,
  Logout,
  Menu as MenuIcon,
  Monitor as MonitorIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Shield as ShieldAdvancedIcon,
  Lock as SSLIcon,
  SystemUpdate as UpdateIcon,
  Language as WebsiteIcon,
} from "@mui/icons-material";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSystemUpdates } from "../../hooks/useSystemUpdates";
import AdminPanel from "../admin/AdminPanel";
import CommandPalette from "../common/CommandPalette";
import BackupManagement from "./BackupManagement";
import CronJobsManagement from "./CronJobsManagement";
import Databases from "./Databases";
import DNSManagement from "./DNSManagement";
import Domains from "./Domains";
import EmailManagement from "./EmailManagement";
import FTPManagement from "./FTPManagement";
import Overview from "./Overview";
import SecurityManagement from "./SecurityManagement";
import SSLManagement from "./SSLManagement";
import SystemConfiguration from "./SystemConfiguration";
import SystemMonitoring from "./SystemMonitoring";
import SystemUpdates from "./SystemUpdates";
import WebsiteManagement from "./WebsiteManagement";

const drawerWidth = 240;

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { user, logout } = useAuth();
  const { updatesAvailable } = useSystemUpdates();

  // Debug info
  console.log("Dashboard rendered - User:", user);
  console.log("Dashboard rendered - activeTab:", activeTab);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!user) {
    return <div>Loading user data...</div>;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleCommandPaletteNavigate = (tabId) => {
    setActiveTab(tabId);
  };

  const menuItems = [
    { id: "overview", label: "Overview", icon: <DashboardIcon /> },
    { id: "websites", label: "Website Management", icon: <WebsiteIcon /> },
    { id: "domains", label: "Domain Management", icon: <DomainIcon /> },
    { id: "databases", label: "Databases", icon: <DatabaseIcon /> },
    { id: "email-advanced", label: "Email", icon: <EmailIcon /> },
    { id: "backups", label: "Backups", icon: <BackupIcon /> },
    {
      id: "monitoring",
      label: "Statistics",
      icon: <MonitorIcon />,
    },
    { id: "system-updates", label: "System Updates", icon: <UpdateIcon /> },
    { id: "system-config", label: "System Config", icon: <SettingsIcon /> },
    { id: "security", label: "Security", icon: <ShieldAdvancedIcon /> },
    { id: "ssl", label: "SSL Certificates", icon: <SSLIcon /> },
    { id: "ftp", label: "FTP Accounts", icon: <FTPIcon /> },
    { id: "cron", label: "Cron Jobs", icon: <CronIcon /> },
    { id: "dns", label: "DNS Management", icon: <DNSIcon /> },
  ];

  if (user?.role === "admin") {
    menuItems.push({ id: "admin", label: "Admin Panel", icon: <AdminIcon /> });
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview onTabChange={setActiveTab} />;
      case "websites":
        return <WebsiteManagement />;
      case "domains":
        return <Domains />;
      case "databases":
        return <Databases />;
      case "email-advanced":
        return <EmailManagement />;
      case "backups":
        return <BackupManagement />;
      case "monitoring":
        return <SystemMonitoring />;
      case "system-updates":
        return <SystemUpdates />;
      case "system-config":
        return <SystemConfiguration />;
      case "ssl":
        return <SSLManagement />;
      case "ftp":
        return <FTPManagement />;
      case "cron":
        return <CronJobsManagement />;
      case "dns":
        return <DNSManagement />;
      case "security":
        return <SecurityManagement />;
      case "admin":
        return user?.role === "admin" ? (
          <AdminPanel />
        ) : (
          <Overview onTabChange={setActiveTab} />
        );
      default:
        return <Overview onTabChange={setActiveTab} />;
    }
  };

  const drawer = (
    <Box
      sx={{
        height: "100vh",
        backgroundColor: "#1e293b", // Dark slate
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Toolbar sx={{ backgroundColor: "#0f172a", flexShrink: 0 }}>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            color: "#60a5fa", // Light blue accent
            fontWeight: "bold",
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          KPanel
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "#334155" }} />
      <List
        sx={{ backgroundColor: "#1e293b", flex: 1, pt: 0, overflow: "auto" }}
      >
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              sx={{
                color: "#cbd5e1", // Light gray for normal text
                "&.Mui-selected": {
                  backgroundColor: "#334155", // Dark gray for selected
                  borderRight: "3px solid #60a5fa", // Light blue border
                  "& .MuiListItemIcon-root": {
                    color: "#60a5fa", // Light blue for selected icon
                  },
                  "& .MuiListItemText-primary": {
                    color: "#60a5fa", // Light blue for selected text
                    fontWeight: 600,
                  },
                },
                "&:hover": {
                  backgroundColor: "#2d3748", // Darker gray for hover
                  color: "#60a5fa", // Light blue on hover
                },
                py: 1.5,
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                {item.id === "system-updates" ? (
                  <Badge
                    badgeContent={updatesAvailable || 6}
                    color="error"
                    variant="standard"
                    sx={{
                      "& .MuiBadge-badge": {
                        right: 3,
                        top: 3,
                      },
                    }}
                  >
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  "& .MuiListItemText-primary": {
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: "white !important",
          color: "#333 !important",
          boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
          borderBottom: "1px solid #e0e0e0",
          "& .MuiToolbar-root": {
            backgroundColor: "white !important",
          },
        }}
      >
        <Toolbar
          sx={{
            minHeight: "64px !important",
            justifyContent: "space-between",
            px: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" }, color: "text.secondary" }}
            >
              <MenuIcon />
            </IconButton>

            {/* Brand Logo */}
            <Box sx={{ display: "flex", alignItems: "center", mr: 4 }}>
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontWeight: "bold",
                  color: "#1976d2", // Blue accent
                  fontFamily: "'Segoe UI', sans-serif",
                  letterSpacing: "0.5px",
                }}
              >
                KPanel
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {/* Enhanced Search Button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon />}
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                borderColor: "#e0e0e0",
                color: "#666",
                textTransform: "none",
                px: 2,
                py: 0.5,
                borderRadius: 2,
                minWidth: "200px",
                justifyContent: "space-between",
                backgroundColor: "#f8f9fa",
                "&:hover": {
                  borderColor: "#1976d2",
                  backgroundColor: "#f0f4ff",
                  color: "#1976d2",
                },
                display: { xs: "none", md: "flex" },
              }}
              endIcon={
                <Chip
                  label="Ctrl+K"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    backgroundColor: "#e8e9ea",
                    color: "#666",
                    border: "none",
                  }}
                />
              }
            >
              Quick Search
            </Button>

            {/* Mobile Search Icon */}
            <IconButton
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                display: { xs: "flex", md: "none" },
                color: "text.secondary",
                backgroundColor: "rgba(0, 0, 0, 0.02)",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                },
              }}
            >
              <SearchIcon />
            </IconButton>

            {/* Account Section */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: "text.primary", fontSize: "0.9rem" }}
              >
                {user?.email}
              </Typography>
              <IconButton
                size="large"
                aria-label="account menu"
                onClick={handleMenu}
                sx={{ color: "text.secondary" }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              backgroundColor: "#1e293b", // Dark theme for mobile drawer
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              backgroundColor: "#1e293b", // Dark theme for desktop drawer
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {renderContent()}
      </Box>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleCommandPaletteNavigate}
        userRole={user?.role}
      />
    </Box>
  );
};

export default Dashboard;
