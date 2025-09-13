import {
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  CloudUpload as UploadIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";

const FileManager = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get("/files");
      setFiles(response.data);
    } catch (error) {
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("File uploaded successfully");
      setUploadOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload file");
    }
  };

  const handleDeleteFile = async (filename) => {
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      try {
        await api.delete("/files", { data: { path: filename } });
        toast.success("File deleted successfully");
        fetchFiles();
      } catch (error) {
        toast.error("Failed to delete file");
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h5">File Manager</Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadOpen(true)}
        >
          Upload File
        </Button>
      </Box>

      <Paper>
        <List>
          {files.map((file, index) => (
            <ListItem key={index} divider>
              <ListItemIcon>
                {file.type === "directory" ? <FolderIcon /> : <FileIcon />}
              </ListItemIcon>
              <ListItemText
                primary={file.name}
                secondary={
                  file.type === "file"
                    ? `${formatFileSize(file.size)} • Modified: ${new Date(
                        file.modified
                      ).toLocaleDateString()}`
                    : "Directory"
                }
              />
              {file.type === "file" && (
                <IconButton
                  color="error"
                  onClick={() => handleDeleteFile(file.name)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </ListItem>
          ))}
          {files.length === 0 && !loading && (
            <ListItem>
              <ListItemText
                primary="No files found"
                secondary="Upload your first file to get started"
                sx={{ textAlign: "center" }}
              />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              fullWidth
            />
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {selectedFile.name} (
                {formatFileSize(selectedFile.size)})
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button
            onClick={handleFileUpload}
            variant="contained"
            disabled={!selectedFile}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileManager;
