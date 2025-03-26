export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat und lon erforderlich" });
  }

  const url = `https://meteostat.p.rapidapi.com/point/daily?lat=${lat}&lon=${lon}&start=2014-01-01&end=2024-12-31&alt=json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': '3d496a7a3cmshcec315ae577d276p1223e8jsnfa572d4f081',
        'X-RapidAPI-Host': 'meteostat.p.rapidapi.com'
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Fehler beim Abrufen der Wetterdaten.' });
  }
}
