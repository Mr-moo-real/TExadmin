import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Button
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

function App() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [messages, setMessages] = useState([
    {
      text: "",
      replies: [""],
      correct: 0,
    },
  ]);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingFilename, setEditingFilename] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/github-scenario")
      .then((res) => res.json())
      .then((data) => {
        setScenarios(data.files || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load scenarios");
        setLoading(false);
      });
  }, [saveSuccess, deleting]);

  const handleOpenEditor = () => {
    setScenarioName("");
    setMessages([
      {
        text: "",
        replies: [""],
        correct: 0,
      },
    ]);
    setEditMode(false);
    setEditingFilename(null);
    setEditorOpen(true);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCloseEditor = () => setEditorOpen(false);

  const handleMessageChange = (idx: number, value: string) => {
    setMessages((msgs) =>
      msgs.map((msg, i) => (i === idx ? { ...msg, text: value } : msg))
    );
  };

  const handleReplyChange = (msgIdx: number, replyIdx: number, value: string) => {
    setMessages((msgs) =>
      msgs.map((msg, i) =>
        i === msgIdx
          ? {
              ...msg,
              replies: msg.replies.map((r, j) => (j === replyIdx ? value : r)),
            }
          : msg
      )
    );
  };

  const handleAddMessage = () => {
    setMessages((msgs) => [
      ...msgs,
      { text: "", replies: [""], correct: 0 },
    ]);
  };

  const handleRemoveMessage = (idx: number) => {
    setMessages((msgs) => msgs.filter((_, i) => i !== idx));
  };

  const handleAddReply = (msgIdx: number) => {
    setMessages((msgs) =>
      msgs.map((msg, i) =>
        i === msgIdx ? { ...msg, replies: [...msg.replies, ""] } : msg
      )
    );
  };

  const handleRemoveReply = (msgIdx: number, replyIdx: number) => {
    setMessages((msgs) =>
      msgs.map((msg, i) =>
        i === msgIdx
          ? {
              ...msg,
              replies: msg.replies.filter((_, j) => j !== replyIdx),
              correct: msg.correct === replyIdx ? 0 : msg.correct > replyIdx ? msg.correct - 1 : msg.correct,
            }
          : msg
      )
    );
  };

  const handleSetCorrect = (msgIdx: number, replyIdx: number) => {
    setMessages((msgs) =>
      msgs.map((msg, i) =>
        i === msgIdx ? { ...msg, correct: replyIdx } : msg
      )
    );
  };

  const handleSaveScenario = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const filename = editMode && editingFilename ? editingFilename : scenarioName.trim().replace(/\s+/g, "_") + ".json";
    const content = { name: scenarioName, messages };
    try {
      const res = await fetch("/api/github-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content }),
      });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error?.message || "Failed to save scenario");
      } else {
        setSaveSuccess(true);
        setEditorOpen(false);
      }
    } catch (e) {
      setSaveError("Failed to save scenario");
    } finally {
      setSaving(false);
    }
  };

  const handleEditScenario = async (filename: string) => {
    setLoading(true);
    setEditMode(true);
    setEditingFilename(filename);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/github-scenario?file=${encodeURIComponent(filename)}`);
      if (!res.ok) {
        setError("Failed to load scenario for editing");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setScenarioName(data.content.name || "");
      setMessages(data.content.messages || []);
      setEditorOpen(true);
    } catch (e) {
      setError("Failed to load scenario for editing");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScenario = (filename: string) => {
    setScenarioToDelete(filename);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteScenario = async () => {
    if (!scenarioToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/github-scenario", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: scenarioToDelete }),
      });
      if (!res.ok) {
        setError("Failed to delete scenario");
      }
    } catch (e) {
      setError("Failed to delete scenario");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setScenarioToDelete(null);
      setSaveSuccess((s) => !s); // trigger reload
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Support Scenario Admin Panel
          </Typography>
          <Button color="inherit" onClick={handleOpenEditor}>
            New Scenario
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Welcome! Select or create a scenario to get started.
        </Typography>
        {loading ? (
          <Box display="flex" alignItems="center" mt={2}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 2 }}>Loading scenarios...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box mt={3}>
            <Typography variant="h6">Saved Scenarios:</Typography>
            {scenarios.length === 0 ? (
              <Typography>No scenarios found.</Typography>
            ) : (
              <List>
                {scenarios.map((file) => (
                  <ListItem key={file} onClick={() => handleEditScenario(file)} style={{ cursor: 'pointer' }}>
                    <ListItemText primary={file} />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit">
                        <IconButton edge="end" onClick={() => handleEditScenario(file)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton edge="end" color="error" onClick={() => handleDeleteScenario(file)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </Container>
      <Dialog open={editorOpen} onClose={handleCloseEditor} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? "Edit Scenario" : "Create Scenario"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            disabled={editMode}
          />
          <List>
            {messages.map((msg, msgIdx) => (
              <Paper key={msgIdx} sx={{ mb: 3, p: 2 }}>
                <Box display="flex" alignItems="center">
                  <TextField
                    label={`Message #${msgIdx + 1}`}
                    value={msg.text}
                    onChange={(e) => handleMessageChange(msgIdx, e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Tooltip title="Remove Message">
                    <span>
                      <IconButton
                        onClick={() => handleRemoveMessage(msgIdx)}
                        disabled={messages.length === 1}
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  Replies:
                </Typography>
                <List>
                  {msg.replies.map((reply, replyIdx) => (
                    <ListItem key={replyIdx} disableGutters>
                      <TextField
                        label={`Reply #${replyIdx + 1}`}
                        value={reply}
                        onChange={(e) => handleReplyChange(msgIdx, replyIdx, e.target.value)}
                        sx={{ mr: 2, flex: 1 }}
                      />
                      <Checkbox
                        checked={msg.correct === replyIdx}
                        onChange={() => handleSetCorrect(msgIdx, replyIdx)}
                        color="primary"
                        inputProps={{ 'aria-label': 'Mark as correct reply' }}
                      />
                      <Tooltip title="Remove Reply">
                        <span>
                          <IconButton
                            onClick={() => handleRemoveReply(msgIdx, replyIdx)}
                            disabled={msg.replies.length === 1}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </ListItem>
                  ))}
                  <ListItem disableGutters>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => handleAddReply(msgIdx)}
                      sx={{ mt: 1 }}
                    >
                      Add Reply
                    </Button>
                  </ListItem>
                </List>
              </Paper>
            ))}
            <Button startIcon={<AddIcon />} onClick={handleAddMessage} sx={{ mb: 2 }}>
              Add Message
            </Button>
          </List>
          {saveError && <Alert severity="error">{saveError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditor} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveScenario} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editMode ? "Save Changes" : "Save Scenario"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Scenario</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <b>{scenarioToDelete}</b>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={confirmDeleteScenario} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default App;
