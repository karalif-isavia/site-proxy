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

// ViewMondo route
app.get('/viewmondo/:runway', async (req, res) => {
  const runway = req.params.runway.toUpperCase();

  try {
    const tokenResponse = await fetch('https://viewmondo.com/Token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        username: process.env.VIEWMONDO_USERNAME,
        password: process.env.VIEWMONDO_PASSWORD
      })
    });

    const { access_token } = await tokenResponse.json();

    const stationsResponse = await fetch('https://viewmondo.com/api/v1/GetStations', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const stations = await stationsResponse.json();
    const match = stations.find(s =>
      s.StationName.toUpperCase().includes('RWY 28')
    );
    if (!match) {
      return res.status(404).json({ error: `Station '${runway}' not found` });
    }

    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const measuresResponse = await fetch('https://viewmondo.com/api/v1/GetMeasureValues', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stationId: match.StationId,
        start,
        end
      })
    });

    const measures = await measuresResponse.json();

    res.json({
      station: match,
      measures
    });

  } catch (err) {
    console.error('ViewMondo error:', err);
    res.status(500).json({ error: 'Failed to get ViewMondo data' });
  }
});



app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
