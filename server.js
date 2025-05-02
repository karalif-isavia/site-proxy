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
app.get('/viewmondo', async (req, res) => {
  try {
    const tokenResponse = await fetch('https://viewmondo.com/Token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'password',
        username: process.env.VIEWMONDO_USERNAME,
        password: process.env.VIEWMONDO_PASSWORD
      })
    });

    if (!tokenResponse.ok) {
      console.error('ViewMondo token error:', await tokenResponse.text());
      return res.status(401).json({ error: 'Failed to get ViewMondo token' });
    }

    const { access_token } = await tokenResponse.json();

    const dataResponse = await fetch('https://viewmondo.com/api/v1/GetStationsWithLastData', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!dataResponse.ok) {
      console.error('ViewMondo data fetch error:', await dataResponse.text());
      return res.status(500).json({ error: 'Failed to fetch ViewMondo data' });
    }

    const data = await dataResponse.json();
    res.json(data);
  } catch (err) {
    console.error('ViewMondo proxy error:', err);
    res.status(500).json({ error: 'Unexpected error accessing ViewMondo' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
