import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPO_OWNER = 'Mr-moo-real';
const REPO_NAME = 'TExadmin';
const SCENARIOS_PATH = 'scenarios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this in Vercel project settings

const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
};

const Buffer = require('buffer').Buffer;

const handler = async function (req, res) {
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Missing GitHub token' });
  }

  if (req.method === 'GET') {
    // If ?file=filename is present, load that scenario
    if (req.query && req.query.file) {
      const file = Array.isArray(req.query.file) ? req.query.file[0] : req.query.file;
      const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCENARIOS_PATH}/${file}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to load scenario' });
      }
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return res.status(200).json({ content: JSON.parse(content) });
    }
    // List all scenario files
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCENARIOS_PATH}`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    const files = Array.isArray(data)
      ? data.filter((f) => f.name.endsWith('.json')).map((f) => f.name)
      : [];
    return res.status(200).json({ files });
  }

  if (req.method === 'POST') {
    // Save a scenario
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Missing filename or content' });
    }
    // Get the SHA if the file exists (for updates)
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCENARIOS_PATH}/${filename}`;
    let sha;
    const getRes = await fetch(getUrl, { headers });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
    // Create or update the file
    const putRes = await fetch(getUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Save scenario ${filename}`,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha,
      }),
    });
    if (!putRes.ok) {
      const error = await putRes.json();
      return res.status(500).json({ error });
    }
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    // Delete a scenario
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Missing filename' });
    }
    // Get the SHA of the file to delete
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SCENARIOS_PATH}/${filename}`;
    const getRes = await fetch(getUrl, { headers });
    if (!getRes.ok) {
      return res.status(404).json({ error: 'File not found' });
    }
    const getData = await getRes.json();
    const sha = getData.sha;
    // Delete the file
    const delRes = await fetch(getUrl, {
      method: 'DELETE',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Delete scenario ${filename}`,
        sha,
      }),
    });
    if (!delRes.ok) {
      const error = await delRes.json();
      return res.status(500).json({ error });
    }
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};

module.exports = handler; 