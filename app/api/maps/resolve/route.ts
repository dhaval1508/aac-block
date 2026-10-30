import { NextResponse } from "next/server";

function isGoogleMapsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com") ||
      host === "google.com"
    );
  } catch {
    return false;
  }
}

function extractCoordinates(urlStr: string): { lat: number; lng: number } | null {
  // Pattern 1: /@23.1118,72.5412
  const atMatch = urlStr.match(/@(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Pattern 2: ?q=23.1118,72.5412 or &q=23.1118,72.5412
  const qCoordMatch = urlStr.match(/[?&]q=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (qCoordMatch) {
    const lat = parseFloat(qCoordMatch[1]);
    const lng = parseFloat(qCoordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Pattern 3: !3d23.1118!4d72.5412 (Protobuf style in Google Maps URLs)
  const protoMatch = urlStr.match(/!3d(-?\d+\.\d{3,})!4d(-?\d+\.\d{3,})/);
  if (protoMatch) {
    const lat = parseFloat(protoMatch[1]);
    const lng = parseFloat(protoMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // Pattern 4: ll=23.1118,72.5412
  const llMatch = urlStr.match(/[?&]ll=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  return null;
}

function extractPlaceName(urlStr: string): string | null {
  try {
    // /place/Name+Of+Place/
    const placeMatch = urlStr.match(/\/place\/([^/@?]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }

    const parsed = new URL(urlStr);
    const q = parsed.searchParams.get("q");
    if (q && !/^-?\d+\.\d+,-?\d+\.\d+$/.test(q.trim())) {
      return q.trim();
    }
  } catch {
    // ignore
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let urlInput = String(body?.url ?? "").trim();

    if (!urlInput) {
      return NextResponse.json(
        { success: false, error: "Please provide a Google Maps URL." },
        { status: 400 }
      );
    }

    if (!/^https?:\/\//i.test(urlInput)) {
      urlInput = `https://${urlInput}`;
    }

    if (!isGoogleMapsUrl(urlInput)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid link. Please paste a valid Google Maps link (e.g. https://maps.app.goo.gl/... or https://google.com/maps/...)",
        },
        { status: 400 }
      );
    }

    let resolvedUrl = urlInput;

    // Follow redirects if it's a short link like maps.app.goo.gl or goo.gl
    if (urlInput.includes("maps.app.goo.gl") || urlInput.includes("goo.gl")) {
      try {
        const headRes = await fetch(urlInput, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        resolvedUrl = headRes.url || urlInput;
      } catch (err) {
        console.warn("Could not resolve short link via GET:", err);
      }
    }

    const coords = extractCoordinates(resolvedUrl);
    const placeName = extractPlaceName(resolvedUrl);

    let address = placeName || "";
    let city = "";
    let state = "";

    // Try reverse geocoding if coordinates exist
    if (coords) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        try {
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`
          );
          const geoData = await geoRes.json();
          if (geoData.status === "OK" && geoData.results?.[0]?.formatted_address) {
            address = geoData.results[0].formatted_address;
            for (const comp of geoData.results[0].address_components || []) {
              if (comp.types.includes("locality")) city = comp.long_name;
              if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
            }
          }
        } catch {
          // ignore
        }
      }

      if (!address) {
        address = placeName
          ? `${placeName} (Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`
          : `Site Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
      }
    }

    return NextResponse.json({
      success: true,
      originalUrl: urlInput,
      resolvedUrl,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      siteName: placeName,
      address,
      city,
      state,
      hasCoordinates: !!coords,
    });
  } catch (error: any) {
    console.error("Resolve Maps URL error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve Google Maps link. Please enter address manually." },
      { status: 500 }
    );
  }
}
