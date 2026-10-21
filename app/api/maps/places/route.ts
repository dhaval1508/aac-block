import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input") || "";

  if (!input.trim() || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&components=country:in&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && Array.isArray(data.predictions)) {
        return NextResponse.json({
          predictions: data.predictions.map((p: any) => ({
            description: p.description,
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || "",
          })),
        });
      }
    } catch (err) {
      console.error("Google Places API error:", err);
    }
  }

  // Fallback intelligent location matches for common construction zones & landmarks in Gujarat
  const queryLower = input.toLowerCase();
  const knownPlaces = [
    {
      description: "Ganesh Glory 11, Jagatpur Chenpur Road, Gota, Ahmedabad, Gujarat 382470",
      placeId: "custom_gg11_ahmedabad",
      mainText: "Ganesh Glory 11",
      secondaryText: "Jagatpur Chenpur Road, Gota, Ahmedabad, Gujarat",
      lat: 23.1118,
      lng: 72.5412,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "382470",
    },
    {
      description: "Ganesh Glory, SG Highway, Jagatpur, Ahmedabad, Gujarat",
      placeId: "custom_gg_ahmedabad",
      mainText: "Ganesh Glory",
      secondaryText: "SG Highway, Jagatpur, Ahmedabad, Gujarat",
      lat: 23.1132,
      lng: 72.5428,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "382481",
    },
    {
      description: "Sanand GIDC Industrial Estate, Sanand, Ahmedabad, Gujarat 382110",
      placeId: "custom_sanand_gidc",
      mainText: "Sanand GIDC Industrial Estate",
      secondaryText: "Sanand, Ahmedabad, Gujarat",
      lat: 22.9839,
      lng: 72.3789,
      city: "Sanand",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "382110",
    },
    {
      description: "Changodar Industrial Area, Bavla Road, Ahmedabad, Gujarat 382213",
      placeId: "custom_changodar",
      mainText: "Changodar Industrial Area",
      secondaryText: "Bavla Road, Ahmedabad, Gujarat",
      lat: 22.9152,
      lng: 72.4385,
      city: "Changodar",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "382213",
    },
    {
      description: "Gift City, Gandhinagar, Gujarat 382355",
      placeId: "custom_gift_city",
      mainText: "GIFT City",
      secondaryText: "Gandhinagar, Gujarat",
      lat: 23.1601,
      lng: 72.6841,
      city: "Gandhinagar",
      district: "Gandhinagar",
      state: "Gujarat",
      pincode: "382355",
    },
    {
      description: "Science City Road, Sola, Ahmedabad, Gujarat 380060",
      placeId: "custom_science_city",
      mainText: "Science City Road",
      secondaryText: "Sola, Ahmedabad, Gujarat",
      lat: 23.0805,
      lng: 72.5029,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "380060",
    },
    {
      description: "South Bopal Commercial & Residential Hub, Ahmedabad, Gujarat 380058",
      placeId: "custom_south_bopal",
      mainText: "South Bopal",
      secondaryText: "Ahmedabad, Gujarat",
      lat: 23.0232,
      lng: 72.4647,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "380058",
    },
    {
      description: "Vaishno Devi Circle, SG Highway, Ahmedabad, Gujarat 382421",
      placeId: "custom_vaishnodevi",
      mainText: "Vaishno Devi Circle",
      secondaryText: "SG Highway, Ahmedabad, Gujarat",
      lat: 23.1362,
      lng: 72.5489,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "382421",
    },
    {
      description: "Shela Construction Hub, Ahmedabad, Gujarat 380058",
      placeId: "custom_shela",
      mainText: "Shela Construction Site",
      secondaryText: "Ahmedabad, Gujarat",
      lat: 23.0084,
      lng: 72.4552,
      city: "Ahmedabad",
      district: "Ahmedabad",
      state: "Gujarat",
      pincode: "380058",
    },
  ];

  const matched = knownPlaces.filter((p) =>
    p.description.toLowerCase().includes(queryLower) ||
    p.mainText.toLowerCase().includes(queryLower)
  );

  return NextResponse.json({
    predictions: matched.map((p) => ({
      description: p.description,
      placeId: p.placeId,
      mainText: p.mainText,
      secondaryText: p.secondaryText,
      lat: p.lat,
      lng: p.lng,
      city: p.city,
      district: p.district,
      state: p.state,
      pincode: p.pincode,
    })),
  });
}
