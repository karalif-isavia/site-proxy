const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Weather route (AWOS at Keflavík)
app.get('/weather', async (req, res) => {
  try {
    const response = await fetch('https://awos.kefairport.is/api/Values/');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Weather proxy error:", error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// DATIS route (BIKF ATIS via ARINC)
app.get('/datis', async (req, res) => {
  try {
    const response = await fetch('https://webdatis.arinc.net/cgi-bin/datis/get_datis?station=BIKF&sessionId=HY618U7T&products=DATIS&arrdep=ARR');
    const text = await response.text();
    res.type('text/plain').send(text);
  } catch (error) {
    console.error("DATIS proxy error:", error);
    res.status(500).send("Failed to fetch DATIS");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
