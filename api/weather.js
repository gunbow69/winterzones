export default async function handler(req, res) {
export default async function handler(req, res) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: "lat und lon erforderlich" });
  }

  const start = "2014-01-01";
  const end = "2023-12-31";

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_min&timezone=auto`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.daily || !data.daily.time) {
      throw new Error("Keine Wetterdaten vom API erhalten.");
    }

    const result = data.daily.time.map((date, i) => ({
      date,
      tmin: data.daily.temperature_2m_min[i]
    }));

    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({ error: "Fehler beim Abrufen der Wetterdaten: " + error.message });
  }
}    
