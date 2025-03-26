
import fallback from '../data/fallback-data.json' assert { type: 'json' };

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

    if (data && data.daily && data.daily.time && data.daily.time.length > 0) {
      const result = data.daily.time.map((date, i) => ({
        date,
        tmin: data.daily.temperature_2m_min[i]
      }));
      return res.status(200).json({ data: result, source: "api" });
    } else {
      throw new Error("Keine Wetterdaten vom API erhalten.");
    }
  } catch (error) {
    const closest = fallback.find(e => Math.abs(e.lat - lat) < 0.5 && Math.abs(e.lon - lon) < 0.5);
    if (closest) {
      const fallbackData = closest.tmin.map((t, i) => ({
        date: (2014 + i) + "-01-01",
        tmin: t
      }));
      return res.status(200).json({ data: fallbackData, source: "fallback" });
    } else {
      return res.status(500).json({ error: "Fehler beim Abrufen der Wetterdaten und kein Fallback gefunden." });
    }
  }
}
