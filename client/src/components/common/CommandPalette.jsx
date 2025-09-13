import {
  AdminPanelSettings as AdminIcon,
  Backup as BackupIcon,
  Schedule as CronIcon,
  Dashboard as DashboardIcon,
  Storage as DatabaseIcon,
  Dns as DNSIcon,
  Domain as DomainIcon,
  Email as EmailIcon,
  Folder as FileIcon,
  FolderSpecial as FTPIcon,
  Monitor as MonitorIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Shield as ShieldAdvancedIcon,
  Lock as SSLIcon,
  SystemUpdate as UpdateIcon,
  Language as WebsiteIcon,
} from "@mui/icons-material";
import {
  Box,
  Dialog,
  DialogContent,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

const CommandPalette = ({ open, onClose, onNavigate, userRole }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCommands, setFilteredCommands] = useState([]);

  // All available commands/features
  const allCommands = [
    // Dashboard & Overview
    {
      id: "overview",
      label: "Overview",
      icon: <DashboardIcon />,
      description: "Dashboard overview with system stats",
      category: "Dashboard",
      keywords: ["dashboard", "overview", "home", "stats", "system"],
    },

    // Domain Management
    {
      id: "domains",
      label: "Domains",
      icon: <DomainIcon />,
      description: "Manage domains and subdomains",
      category: "Hosting",
      keywords: ["domain", "subdomain", "website", "dns", "hosting"],
    },

    // Database Management
    {
      id: "databases",
      label: "Databases",
      icon: <DatabaseIcon />,
      description: "MySQL database management",
      category: "Database",
      keywords: ["database", "mysql", "sql", "phpmyadmin", "data"],
    },

    // File Management
    {
      id: "files",
      label: "File Manager",
      icon: <FileIcon />,
      description: "Upload, edit and manage files",
      category: "Files",
      keywords: ["files", "upload", "download", "ftp", "editor", "filemanager"],
    },

    // Website Management
    {
      id: "websites",
      label: "Website Management",
      icon: <WebsiteIcon />,
      description: "Manage websites, applications and installations",
      category: "Hosting",
      keywords: [
        "website",
        "apps",
        "installer",
        "applications",
        "web",
        "hosting",
      ],
    },

    // Email Management
    {
      id: "email-advanced",
      label: "Email",
      icon: <EmailIcon />,
      description: "Advanced email features and settings",
      category: "Email",
      keywords: [
        "email",
        "advanced",
        "spam",
        "filter",
        "forwarder",
        "autoresponder",
        "mail",
        "smtp",
        "pop",
        "imap",
        "webmail",
      ],
    },

    // Backup Management
    {
      id: "backups",
      label: "Backups",
      icon: <BackupIcon />,
      description: "Create and restore backups",
      category: "Backup",
      keywords: ["backup", "restore", "snapshot", "export", "import"],
    },

    // Monitoring
    {
      id: "monitoring",
      label: "Monitoring",
      icon: <MonitorIcon />,
      description: "System monitoring and analytics",
      category: "System",
      keywords: [
        "monitoring",
        "analytics",
        "performance",
        "logs",
        "stats",
        "cpu",
        "memory",
        "disk",
      ],
    },

    // System Updates
    {
      id: "system-updates",
      label: "System Updates",
      icon: <UpdateIcon />,
      description: "System updates and patches",
      category: "System",
      keywords: ["updates", "patches", "system", "upgrade", "security"],
    },

    // DNS Management
    {
      id: "dns",
      label: "DNS Management",
      icon: <DNSIcon />,
      description: "Manage DNS records and settings",
      category: "DNS",
      keywords: ["dns", "records", "nameserver", "a record", "cname", "mx"],
    },

    // Cron Jobs
    {
      id: "cron",
      label: "Cron Jobs",
      icon: <CronIcon />,
      description: "Schedule automated tasks",
      category: "Automation",
      keywords: ["cron", "schedule", "task", "automation", "job"],
    },

    // FTP Management
    {
      id: "ftp",
      label: "FTP Management",
      icon: <FTPIcon />,
      description: "Manage FTP accounts and access",
      category: "Files",
      keywords: ["ftp", "sftp", "file transfer", "upload", "download"],
    },

    // SSL Management
    {
      id: "ssl",
      label: "SSL/TLS",
      icon: <SSLIcon />,
      description: "SSL certificate management",
      category: "Security",
      keywords: [
        "ssl",
        "tls",
        "certificate",
        "https",
        "security",
        "encryption",
      ],
    },

    // Security
    {
      id: "security",
      label: "Security",
      icon: <ShieldAdvancedIcon />,
      description: "Security settings and firewall",
      category: "Security",
      keywords: ["security", "firewall", "protection", "malware", "antivirus"],
    },

    // System Configuration
    {
      id: "system-config",
      label: "System Configuration",
      icon: <SettingsIcon />,
      description: "Server configuration and settings",
      category: "System",
      keywords: [
        "config",
        "configuration",
        "settings",
        "server",
        "php",
        "apache",
      ],
    },

    // Quick Actions (Virtual commands for common tasks)
    {
      id: "add-domain",
      label: "Add New Domain",
      icon: <DomainIcon />,
      description: "Quickly add a new domain to your account",
      category: "Quick Actions",
      keywords: ["add", "new", "create", "domain", "quick"],
    },
    {
      id: "create-database",
      label: "Create Database",
      icon: <DatabaseIcon />,
      description: "Create a new MySQL database",
      category: "Quick Actions",
      keywords: ["add", "new", "create", "database", "mysql", "quick"],
    },
    {
      id: "create-email",
      label: "Create Email Account",
      icon: <EmailIcon />,
      description: "Set up a new email account",
      category: "Quick Actions",
      keywords: ["add", "new", "create", "email", "account", "quick"],
    },
    {
      id: "upload-files",
      label: "Upload Files",
      icon: <FileIcon />,
      description: "Upload files to your website",
      category: "Quick Actions",
      keywords: ["upload", "files", "website", "quick"],
    },
  ];

  // Add admin-only commands if user is admin
  const adminCommands = [
    {
      id: "admin",
      label: "Admin Panel",
      icon: <AdminIcon />,
      description: "Administrative controls and user management",
      category: "Admin",
      keywords: ["admin", "administration", "users", "packages", "reseller"],
    },
  ];

  const commands =
    userRole === "admin" ? [...allCommands, ...adminCommands] : allCommands;

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCommands(commands);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = commands.filter(
        (command) =>
          command.label.toLowerCase().includes(query) ||
          command.description.toLowerCase().includes(query) ||
          command.category.toLowerCase().includes(query) ||
          command.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query)
          )
      );
      setFilteredCommands(filtered);
    }
  }, [searchQuery, userRole]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && filteredCommands.length > 0) {
      handleCommandSelect(filteredCommands[0]);
    } else if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      // Future: Add keyboard navigation between items
      event.preventDefault();
    }
  };

  const handleCommandSelect = (command) => {
    onNavigate(command.id);
    onClose();
    setSearchQuery("");
  };

  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {});

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          mt: 8,
          mb: 4,
          borderRadius: 2,
          maxHeight: "70vh",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            fullWidth
            placeholder="Search features... (try 'domain', 'email', 'backup', etc.)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  border: "none",
                },
              },
            }}
          />
        </Box>

        <Box sx={{ maxHeight: "50vh", overflow: "auto" }}>
          {Object.keys(groupedCommands).length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                No features found for "{searchQuery}"
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Try searching for: domain, email, database, files, ssl, backup
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => (
              <Box key={category}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: "grey.50",
                    color: "primary.main",
                    fontWeight: 600,
                  }}
                >
                  {category} ({commands.length})
                </Typography>
                <List dense>
                  {commands.map((command) => (
                    <ListItem key={command.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleCommandSelect(command)}
                        sx={{
                          py: 1.5,
                          "&:hover": {
                            backgroundColor: "primary.light",
                            color: "primary.contrastText",
                            "& .MuiListItemIcon-root": {
                              color: "primary.contrastText",
                            },
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {command.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={command.label}
                          secondary={command.description}
                          primaryTypographyProps={{
                            fontWeight: 500,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            backgroundColor: "grey.50",
          }}
        >
          <Typography variant="caption" color="textSecondary">
            {filteredCommands.length} features available • Press{" "}
            <kbd
              style={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: 3,
                padding: "2px 6px",
                fontFamily: "monospace",
              }}
            >
              Enter
            </kbd>{" "}
            to navigate •{" "}
            <kbd
              style={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: 3,
                padding: "2px 6px",
                fontFamily: "monospace",
              }}
            >
              Esc
            </kbd>{" "}
            to close •{" "}
            <kbd
              style={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: 3,
                padding: "2px 6px",
                fontFamily: "monospace",
              }}
            >
              Ctrl+K
            </kbd>{" "}
            to reopen
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
