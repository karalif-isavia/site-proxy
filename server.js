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
app.get('/viewmondo/rwy10', async (req, res) => {
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

    // STEP 1: Get all stations
    const stationsResponse = await fetch('https://viewmondo.com/api/v1/GetStations', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const stations = await stationsResponse.json();

    // STEP 2: Find RWY 10 (case-insensitive match just in case)
    const rwy10 = stations.find(s => s.StationName.includes('28'));

    if (!rwy10) {
      console.error("RWY 10 station not found");
      return res.status(404).json({ error: 'RWY 10 not found' });
    }

    // STEP 3: Fetch last measure values
    const measuresResponse = await fetch(`https://viewmondo.com/api/v1/GetLastMeasureValues?stationId=${rwy10.StationId}`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const measures = await measuresResponse.json();
    res.json({ station: rwy10, measures });

  } catch (err) {
    console.error('ViewMondo proxy error:', err);
    res.status(500).json({ error: 'Failed to get ViewMondo RWY10 data' });
  }
});



app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
