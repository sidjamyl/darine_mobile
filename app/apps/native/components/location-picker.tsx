import * as ExpoLocation from "expo-location";
import { Button, Card, FieldError, Input, Label, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { useAppTheme } from "@/contexts/app-theme-context";
import { joumlaColors } from "@/lib/app-shell";

type Coordinates = {
  latitude: number | null;
  longitude: number | null;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type LocationPickerProps = Coordinates & {
  onChange: (coordinates: Coordinates) => void;
  onAddressSelected?: (address: string) => void;
};

const DEFAULT_COORDINATES = {
  latitude: 36.7538,
  longitude: 3.0588,
};

const copy = {
  fr: {
    title: "Localisation optionnelle",
    description: "Utilisez votre position ou cherchez une adresse OSM. L'adresse manuelle reste suffisante.",
    useCurrent: "Utiliser ma position",
    searchLabel: "Recherche OSM",
    searchPlaceholder: "Ex: Bab Ezzouar, Alger",
    search: "Chercher",
    map: "Carte et pin",
    clear: "Supprimer la position",
    permissionDenied: "Permission refusee. Vous pouvez continuer avec l'adresse manuelle.",
    searchFailed: "Recherche indisponible pour le moment.",
    noResult: "Aucun resultat trouve.",
    selected: "Position selectionnee",
  },
  ar: {
    title: "الموقع اختياري",
    description: "استعمل موقعك او ابحث في OSM. العنوان اليدوي يكفي ايضا.",
    useCurrent: "استعمال موقعي",
    searchLabel: "بحث OSM",
    searchPlaceholder: "مثال: باب الزوار، الجزائر",
    search: "بحث",
    map: "الخريطة والدبوس",
    clear: "حذف الموقع",
    permissionDenied: "تم رفض الاذن. يمكنك المتابعة بالعنوان اليدوي.",
    searchFailed: "البحث غير متاح حاليا.",
    noResult: "لم يتم العثور على نتائج.",
    selected: "تم اختيار الموقع",
  },
};

function buildLeafletHtml(latitude: number, longitude: number) {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var selected = [${latitude}, ${longitude}];
    var map = L.map('map', { zoomControl: true }).setView(selected, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    var marker = L.marker(selected, { draggable: true }).addTo(map);
    function send(latlng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'pin',
        latitude: latlng.lat,
        longitude: latlng.lng
      }));
    }
    marker.on('dragend', function(event) { send(event.target.getLatLng()); });
    map.on('click', function(event) {
      marker.setLatLng(event.latlng);
      send(event.latlng);
    });
  </script>
</body>
</html>`;
}

export function LocationPicker({ latitude, longitude, onChange, onAddressSelected }: LocationPickerProps) {
  const { language, isDark, isRtl } = useAppTheme();
  const labels = copy[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const selectedLatitude = latitude ?? DEFAULT_COORDINATES.latitude;
  const selectedLongitude = longitude ?? DEFAULT_COORDINATES.longitude;
  const hasCoordinates = latitude !== null && longitude !== null;

  async function useCurrentLocation() {
    setMessage(null);
    setIsLocating(true);
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setMessage(labels.permissionDenied);
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setShowMap(true);
    } catch {
      setMessage(labels.searchFailed);
    } finally {
      setIsLocating(false);
    }
  }

  async function searchAddress() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setMessage(null);
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=dz&q=${encodeURIComponent(trimmedQuery)}`,
        {
          headers: {
            "Accept-Language": language === "ar" ? "ar" : "fr",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Nominatim request failed");
      }

      const data = (await response.json()) as NominatimResult[];
      setResults(data);
      if (data.length === 0) {
        setMessage(labels.noResult);
      }
    } catch {
      setMessage(labels.searchFailed);
    } finally {
      setIsSearching(false);
    }
  }

  function selectResult(result: NominatimResult) {
    const nextLatitude = Number(result.lat);
    const nextLongitude = Number(result.lon);

    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return;

    onChange({ latitude: nextLatitude, longitude: nextLongitude });
    onAddressSelected?.(result.display_name);
    setShowMap(true);
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; latitude?: number; longitude?: number };

      if (payload.type !== "pin") return;
      if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") return;

      onChange({ latitude: payload.latitude, longitude: payload.longitude });
    } catch {
      // Ignore malformed WebView messages.
    }
  }

  return (
    <Card
      style={{
        backgroundColor: isDark ? joumlaColors.darkCard : "#FFFFFF",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark ? "#27334A" : joumlaColors.line,
        padding: 16,
      }}
    >
      <View style={{ gap: 14, alignItems: isRtl ? "flex-end" : "stretch" }}>
        <View style={{ gap: 4, alignItems: isRtl ? "flex-end" : "flex-start" }}>
          <Text selectable style={{ color: isDark ? "#F8FAFC" : joumlaColors.navy, fontSize: 18, fontWeight: "800" }}>
            {labels.title}
          </Text>
          <Text
            selectable
            style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, lineHeight: 20, textAlign: isRtl ? "right" : "left" }}
          >
            {labels.description}
          </Text>
        </View>

        <Button onPress={useCurrentLocation} isDisabled={isLocating} variant="secondary">
          {isLocating ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.useCurrent}</Button.Label>}
        </Button>

        <TextField>
          <Label>{labels.searchLabel}</Label>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={labels.searchPlaceholder}
            returnKeyType="search"
            onSubmitEditing={searchAddress}
          />
        </TextField>

        <Button onPress={searchAddress} isDisabled={isSearching || query.trim().length === 0} variant="outline">
          {isSearching ? <Spinner size="sm" color="default" /> : <Button.Label>{labels.search}</Button.Label>}
        </Button>

        {message ? <FieldError isInvalid>{message}</FieldError> : null}

        {results.length > 0 ? (
          <View style={{ gap: 8 }}>
            {results.map((result) => (
              <Pressable
                key={result.place_id}
                onPress={() => selectResult(result)}
                style={{
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: isDark ? "#334155" : joumlaColors.line,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: isDark ? "#111827" : "#F8FAFC",
                }}
              >
                <Text
                  selectable
                  numberOfLines={2}
                  style={{ color: isDark ? "#E2E8F0" : joumlaColors.navy, textAlign: isRtl ? "right" : "left" }}
                >
                  {result.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <Button onPress={() => setShowMap((current) => !current)} variant="ghost">
            <Button.Label>{labels.map}</Button.Label>
          </Button>

          {showMap ? (
            <View
              style={{
                height: 280,
                overflow: "hidden",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? "#334155" : joumlaColors.line,
              }}
            >
              <WebView
                key={`${selectedLatitude.toFixed(5)}-${selectedLongitude.toFixed(5)}`}
                originWhitelist={["*"]}
                source={{ html: buildLeafletHtml(selectedLatitude, selectedLongitude) }}
                onMessage={handleMapMessage}
              />
            </View>
          ) : null}
        </View>

        {hasCoordinates ? (
          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: isDark ? "#CBD5E1" : joumlaColors.slate, textAlign: isRtl ? "right" : "left" }}>
              {labels.selected}: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </Text>
            <Button variant="danger-soft" onPress={() => onChange({ latitude: null, longitude: null })}>
              <Button.Label>{labels.clear}</Button.Label>
            </Button>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
