import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: "Valid latitude and longitude numbers are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    let address = "";
    let city = "";
    let district = "";
    let state = "";
    let pincode = "";

    if (apiKey) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const geoData = await geoRes.json();
        if (geoData.status === "OK" && geoData.results?.[0]?.formatted_address) {
          address = geoData.results[0].formatted_address;
          for (const comp of geoData.results[0].address_components || []) {
            if (comp.types.includes("locality")) city = comp.long_name;
            if (comp.types.includes("administrative_area_level_2")) district = comp.long_name;
            if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
            if (comp.types.includes("postal_code")) pincode = comp.long_name;
          }
        }
      } catch (err) {
        console.warn("Google Reverse Geocode API error:", err);
      }
    }

    if (!address) {
      address = `GPS Site Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    return NextResponse.json({
      success: true,
      latitude: lat,
      longitude: lng,
      address,
      city,
      district,
      state,
      pincode,
    });
  } catch (error: any) {
    console.error("Reverse geocode error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reverse geocode location." },
      { status: 500 }
    );
  }
}
