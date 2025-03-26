const placeMap = new Map();

document.getElementById('locationInput').addEventListener('input', fetchSuggestions);

async function fetchSuggestions() {
  const input = document.getElementById('locationInput').value;
  const datalist = document.getElementById('suggestions');
  datalist.innerHTML = '';
  placeMap.clear();

  if (input.length < 3) return;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=10&q=${encodeURIComponent(input)}`);
    const data = await response.json();

    data.forEach(place => {
      const label = place.display_name;
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      placeMap.set(label, { lat, lon, displayName: label });

      const option = document.createElement('option');
      option.value = label;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Fehler beim Laden der Vorschläge:", error);
  }
}

async function getZone() {
  const input = document.getElementById('locationInput').value;
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = 'Lade Daten...';

  try {
    const currentYear = new Date().getFullYear();
    let locationData = placeMap.get(input);

    if (!locationData) {
      const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(input)}`);
      const fallbackData = await fallbackRes.json();
      if (!fallbackData[0]) throw new Error("Ort nicht gefunden.");

      locationData = {
        lat: parseFloat(fallbackData[0].lat),
        lon: parseFloat(fallbackData[0].lon),
        displayName: fallbackData[0].display_name
      };
    }

    let { lat, lon, displayName } = locationData;
    lat = parseFloat((lat + 0.03).toFixed(2));
    lon = parseFloat((lon + 0.03).toFixed(2));

    const weatherRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const weatherData = await weatherRes.json();

    if (!weatherData.data || weatherData.data.length === 0) {
      throw new Error("Keine Wetterdaten verfügbar für diesen Ort.");
    }

    const dates = weatherData.data.map(day => day.date);
    const temps = weatherData.data.map(day => day.tmin);

    const yearlyMin = {};
    for (let i = 0; i < dates.length; i++) {
      const year = dates[i].split('-')[0];
      if (!yearlyMin[year] || temps[i] < yearlyMin[year]) {
        yearlyMin[year] = temps[i];
      }
    }

    const years = Object.keys(yearlyMin);
    const minTemps = Object.values(yearlyMin);
    const overallMin = Math.min(...minTemps);

    const elevationRes = await fetch(`https://api.opentopodata.org/v1/eudem25m?locations=${lat},${lon}`);
    const elevationData = await elevationRes.json();
    let elevation = elevationData.results?.[0]?.elevation;
    if (!elevation) elevation = 0;

    const correctedMin = overallMin - (elevation / 100) * 0.6;
    const { zone: correctedZone, range: correctedRange } = getUSDAZoneCelsius(correctedMin);

    const { zone, range } = getUSDAZoneCelsius(overallMin);
    resultDiv.textContent = `📍 ${displayName}
🏔️ Höhe: ${Math.round(elevation)} m
🌡️ Geringste Temperatur (${currentYear - 10}–${currentYear}): ${overallMin.toFixed(1)} °C
➤ Korrigierte Tmin: ${correctedMin.toFixed(1)} °C → Winterhärtezone: ${correctedZone} (${correctedRange})`;

    showChart(years, minTemps);
  } catch (error) {
    resultDiv.textContent = `Fehler: ${error.message}`;
    if (window.tempChart) window.tempChart.destroy();
  }
}

function showChart(labels, data) {
  const ctx = document.getElementById('tempChart').getContext('2d');
  if (window.tempChart) window.tempChart.destroy();
  window.tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Jährliche Tiefsttemperatur (°C)',
        data: data,
        borderWidth: 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Temperatur (°C)'
          }
        }
      }
    }
  });
}

function getUSDAZoneCelsius(tempC) {
  const zones = [
    { zone: "2a", max: -42.8, min: -45.6 },
    { zone: "2b", max: -40.0, min: -42.8 },
    { zone: "3a", max: -37.2, min: -40.0 },
    { zone: "3b", max: -34.4, min: -37.2 },
    { zone: "4a", max: -31.7, min: -34.4 },
    { zone: "4b", max: -28.9, min: -31.7 },
    { zone: "5a", max: -26.1, min: -28.9 },
    { zone: "5b", max: -23.3, min: -26.1 },
    { zone: "6a", max: -20.6, min: -23.3 },
    { zone: "6b", max: -17.8, min: -20.6 },
    { zone: "7a", max: -15.0, min: -17.8 },
    { zone: "7b", max: -12.2, min: -15.0 },
    { zone: "8a", max: -9.4, min: -12.2 },
    { zone: "8b", max: -6.6, min: -9.4 },
    { zone: "9a", max: -3.9, min: -6.6 },
    { zone: "9b", max: -1.1, min: -3.9 },
    { zone: "10a", max: 1.6, min: -1.1 },
    { zone: "10b", max: 4.4, min: 1.6 },
    { zone: "11a", max: 7.2, min: 4.4 },
    { zone: "11b", max: 9.9, min: 7.2 },
    { zone: "12a", max: 12.7, min: 10.0 },
    { zone: "12b", max: 15.5, min: 12.7 }
  ];

  for (let z of zones) {
    if (tempC >= z.min && tempC <= z.max) {
      return { zone: z.zone, range: `${z.min.toFixed(1)} °C bis ${z.max.toFixed(1)} °C` };
    }
  }
  return { zone: "unbekannt", range: "außerhalb definierter Skala" };
}
