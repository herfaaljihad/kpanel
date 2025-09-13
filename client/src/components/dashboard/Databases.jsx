import {
  Add as AddIcon,
  Backup as BackupIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CloudUpload as ImportIcon,
  Person as PersonIcon,
  Terminal as QueryIcon,
  Storage as StorageIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const Databases = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [databases, setDatabases] = useState([]);
  const [databaseUsers, setDatabaseUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [openDatabase, setOpenDatabase] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [openQuery, setOpenQuery] = useState(false);
  const [openBackup, setOpenBackup] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  // Form states
  const [newDatabase, setNewDatabase] = useState({
    name: "",
    description: "",
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    engine: "mysql",
  });

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    database: "",
    privileges: [],
    host: "localhost",
  });

  const [queryData, setQueryData] = useState({
    database: "",
    query: "",
    results: null,
  });

  const [backupData, setBackupData] = useState({
    database: "",
    includeData: true,
    includeStructure: true,
    compression: "gzip",
  });

  useEffect(() => {
    fetchDatabases();
    fetchDatabaseUsers();
  }, []);

  const fetchDatabases = async () => {
    try {
      const response = await api.get("/databases");
      setDatabases(response.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch databases");
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseUsers = async () => {
    try {
      const response = await api.get("/database-users");
      setDatabaseUsers(response.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch database users");
    }
  };

  const handleCreateDatabase = async () => {
    try {
      await api.post("/databases", newDatabase);
      toast.success("Database created successfully");
      setOpenDatabase(false);
      setNewDatabase({
        name: "",
        description: "",
        charset: "utf8mb4",
        collation: "utf8mb4_unicode_ci",
        engine: "mysql",
      });
      fetchDatabases();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create database");
    }
  };

  const handleCreateUser = async () => {
    try {
      await api.post("/database-users", newUser);
      toast.success("Database user created successfully");
      setOpenUser(false);
      setNewUser({
        username: "",
        password: "",
        database: "",
        privileges: [],
        host: "localhost",
      });
      fetchDatabaseUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const handleExecuteQuery = async () => {
    try {
      const response = await api.post("/database-advanced/query", queryData);
      setQueryData((prev) => ({ ...prev, results: response.data.results }));
      toast.success("Query executed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to execute query");
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const response = await api.post("/database-advanced/backup", backupData);
      toast.success("Database backup completed");
      // Handle download
      window.open(response.data.downloadUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to backup database");
    }
  };

  const handleDeleteDatabase = async (id) => {
    if (
      window.confirm("Are you sure? This will permanently delete the database!")
    ) {
      try {
        await api.delete(`/database-advanced/databases/${id}`);
        toast.success("Database deleted successfully");
        fetchDatabases();
      } catch (error) {
        toast.error("Failed to delete database");
      }
    }
  };

  const DatabaseOverview = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">Database Management</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={() => setOpenUser(true)}
            sx={{ mr: 1 }}
          >
            Create User
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDatabase(true)}
          >
            Create Database
          </Button>
        </Box>
      </Box>

      {/* Database Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Databases
              </Typography>
              <Typography variant="h4">{databases.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">{databaseUsers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Storage
              </Typography>
              <Typography variant="h4">
                {databases
                  .reduce((total, db) => total + (db.size_mb || 0), 0)
                  .toFixed(2)}{" "}
                MB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Connections
              </Typography>
              <Typography variant="h4">
                {databases.reduce(
                  (total, db) => total + (db.connections || 0),
                  0
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Databases Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Engine</TableCell>
              <TableCell>Tables</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {databases.map((database) => (
              <TableRow key={database.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {database.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {database.description || "No description"}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{database.engine || "MySQL"}</TableCell>
                <TableCell>{database.tables || 0}</TableCell>
                <TableCell>{database.size_mb || 0} MB</TableCell>
                <TableCell>{database.user_count || 0}</TableCell>
                <TableCell>
                  <Chip
                    label={database.status || "active"}
                    color={database.status === "active" ? "success" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(database.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="SQL Query">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setQueryData((prev) => ({
                          ...prev,
                          database: database.name,
                        }));
                        setOpenQuery(true);
                      }}
                    >
                      <QueryIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Backup">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setBackupData((prev) => ({
                          ...prev,
                          database: database.name,
                        }));
                        setOpenBackup(true);
                      }}
                    >
                      <BackupIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="phpMyAdmin">
                    <IconButton
                      size="small"
                      onClick={() =>
                        window.open(`/phpmyadmin?db=${database.name}`, "_blank")
                      }
                    >
                      <StorageIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDatabase(database.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const DatabaseUsers = () => (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Database Users</Typography>
        <Button
          variant="contained"
          startIcon={<PersonIcon />}
          onClick={() => setOpenUser(true)}
        >
          Create User
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>Databases</TableCell>
              <TableCell>Privileges</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {databaseUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.host}</TableCell>
                <TableCell>{user.databases?.join(", ") || "-"}</TableCell>
                <TableCell>
                  {user.privileges?.map((priv) => (
                    <Chip
                      key={priv}
                      label={priv}
                      size="small"
                      sx={{ mr: 0.5 }}
                    />
                  ))}
                </TableCell>
                <TableCell>
                  {user.last_login
                    ? new Date(user.last_login).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const DatabaseTools = () => (
    <Box>
      <Typography variant="h6" mb={3}>
        Database Tools
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <QueryIcon sx={{ mr: 1 }} />
                SQL Query Executor
              </Typography>
              <Typography color="textSecondary" mb={2}>
                Execute custom SQL queries directly
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setOpenQuery(true)}
              >
                Open Query Tool
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <BackupIcon sx={{ mr: 1 }} />
                Backup & Restore
              </Typography>
              <Typography color="textSecondary" mb={2}>
                Create backups and restore databases
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  onClick={() => setOpenBackup(true)}
                  sx={{ flex: 1 }}
                >
                  Backup
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setOpenImport(true)}
                  sx={{ flex: 1 }}
                >
                  Restore
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <StorageIcon sx={{ mr: 1 }} />
                phpMyAdmin
              </Typography>
              <Typography color="textSecondary" mb={2}>
                Access phpMyAdmin web interface
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => window.open("/phpmyadmin", "_blank")}
              >
                Open phpMyAdmin
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ImportIcon sx={{ mr: 1 }} />
                Import/Export
              </Typography>
              <Typography color="textSecondary" mb={2}>
                Import SQL files or export databases
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  sx={{ flex: 1 }}
                  onClick={() => setOpenImport(true)}
                >
                  Import
                </Button>
                <Button variant="outlined" sx={{ flex: 1 }}>
                  Export
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Databases" />
        <Tab label="Users" />
        <Tab label="Tools" />
        <Tab label="Settings" />
      </Tabs>

      {activeTab === 0 && <DatabaseOverview />}
      {activeTab === 1 && <DatabaseUsers />}
      {activeTab === 2 && <DatabaseTools />}
      {activeTab === 3 && (
        <Box>
          <Typography variant="h6" mb={3}>
            Database Settings
          </Typography>
          <Alert severity="info">
            Database configuration settings will be available in the next
            update.
          </Alert>
        </Box>
      )}

      {/* Create Database Dialog */}
      <Dialog
        open={openDatabase}
        onClose={() => setOpenDatabase(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Database</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Database Name"
            fullWidth
            variant="outlined"
            value={newDatabase.name}
            onChange={(e) =>
              setNewDatabase({ ...newDatabase, name: e.target.value })
            }
            helperText="Use lowercase letters, numbers, and underscores only"
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={newDatabase.description}
            onChange={(e) =>
              setNewDatabase({ ...newDatabase, description: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Character Set</InputLabel>
            <Select
              value={newDatabase.charset}
              onChange={(e) =>
                setNewDatabase({ ...newDatabase, charset: e.target.value })
              }
            >
              <MenuItem value="utf8mb4">utf8mb4 (Recommended)</MenuItem>
              <MenuItem value="utf8">utf8</MenuItem>
              <MenuItem value="latin1">latin1</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Collation</InputLabel>
            <Select
              value={newDatabase.collation}
              onChange={(e) =>
                setNewDatabase({ ...newDatabase, collation: e.target.value })
              }
            >
              <MenuItem value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</MenuItem>
              <MenuItem value="utf8mb4_general_ci">utf8mb4_general_ci</MenuItem>
              <MenuItem value="utf8_general_ci">utf8_general_ci</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDatabase(false)}>Cancel</Button>
          <Button
            onClick={handleCreateDatabase}
            variant="contained"
            disabled={!newDatabase.name}
          >
            Create Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog
        open={openUser}
        onClose={() => setOpenUser(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Database User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            variant="outlined"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Database</InputLabel>
            <Select
              value={newUser.database}
              onChange={(e) =>
                setNewUser({ ...newUser, database: e.target.value })
              }
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.name}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Host"
            fullWidth
            variant="outlined"
            value={newUser.host}
            onChange={(e) => setNewUser({ ...newUser, host: e.target.value })}
            helperText="localhost, %, or specific IP address"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUser(false)}>Cancel</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!newUser.username || !newUser.password}
          >
            Create User
          </Button>
        </DialogActions>
      </Dialog>

      {/* SQL Query Dialog */}
      <Dialog
        open={openQuery}
        onClose={() => setOpenQuery(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>SQL Query Executor</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Database</InputLabel>
            <Select
              value={queryData.database}
              onChange={(e) =>
                setQueryData({ ...queryData, database: e.target.value })
              }
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.name}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="SQL Query"
            fullWidth
            variant="outlined"
            multiline
            rows={8}
            value={queryData.query}
            onChange={(e) =>
              setQueryData({ ...queryData, query: e.target.value })
            }
            placeholder="SELECT * FROM table_name;"
          />
          {queryData.results && (
            <Box mt={2}>
              <Typography variant="h6" gutterBottom>
                Results:
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 300, overflow: "auto" }}>
                <pre>{JSON.stringify(queryData.results, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuery(false)}>Close</Button>
          <Button
            onClick={handleExecuteQuery}
            variant="contained"
            disabled={!queryData.database || !queryData.query}
          >
            Execute Query
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog
        open={openBackup}
        onClose={() => setOpenBackup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Backup Database</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Database</InputLabel>
            <Select
              value={backupData.database}
              onChange={(e) =>
                setBackupData({ ...backupData, database: e.target.value })
              }
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.name}>
                  {db.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={backupData.includeStructure}
                onChange={(e) =>
                  setBackupData({
                    ...backupData,
                    includeStructure: e.target.checked,
                  })
                }
              />
            }
            label="Include Structure"
          />
          <FormControlLabel
            control={
              <Switch
                checked={backupData.includeData}
                onChange={(e) =>
                  setBackupData({
                    ...backupData,
                    includeData: e.target.checked,
                  })
                }
              />
            }
            label="Include Data"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Compression</InputLabel>
            <Select
              value={backupData.compression}
              onChange={(e) =>
                setBackupData({ ...backupData, compression: e.target.value })
              }
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="gzip">Gzip</MenuItem>
              <MenuItem value="zip">ZIP</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBackup(false)}>Cancel</Button>
          <Button
            onClick={handleBackupDatabase}
            variant="contained"
            disabled={!backupData.database}
          >
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Databases;
